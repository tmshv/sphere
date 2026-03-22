# Plan: Full-Text Search for GeoJSON Sources (tantivy)

## Context

Users need to find specific features within a loaded GeoJSON source by typing into a search
box. The search should cover all feature properties regardless of key name or value type.
Clicking a result navigates the map to that feature. The backend uses tantivy with an
in-memory index (one per source) built at load time.

---

## Backend

### Task 1: Add tantivy dependency

**File:** `src-tauri/Cargo.toml`

```toml
tantivy = "0.22"
```

---

### Task 2: Expose `feature_bbox` and `get_feature_by_id` from `FeatureStore`

**File:** `crates/libsphere/src/store.rs`

Make `compute_feature_bbox` callable from `src-tauri` by adding a thin public wrapper,
and add a lookup method on `FeatureStore`:

```rust
/// Public re-export of the private bbox computation.
pub fn feature_bbox(feature: &Feature) -> Option<Bbox> {
    compute_feature_bbox(feature)
}

impl FeatureStore {
    pub fn get_feature_by_id(&self, id: u64) -> Option<&Feature> {
        self.features.iter().find(|f| match &f.id {
            Some(geojson::feature::Id::Number(n)) => n.as_u64() == Some(id),
            _ => false,
        })
    }
}
```

**File:** `crates/libsphere/src/lib.rs` — re-export:

```rust
pub use store::{feature_bbox, FeatureStore, PageResult};
```

---

### Task 3: Create `src-tauri/src/search.rs`

New file. Owns all tantivy logic. Features with no numeric `id` are skipped (MBTiles
sources never reach here anyway).

```rust
use geojson::Feature;
use serde::Serialize;
use serde_json::Value;
use tantivy::{doc, query::QueryParser, schema::{Schema, FAST, STORED, TEXT}, Index, TantivyDocument};

#[derive(Debug, Serialize, Clone)]
pub struct SearchResult {
    pub feature_id: u64,
    pub score: f32,
    pub label: String,
    pub bbox: Option<[f64; 4]>,
}

pub struct SearchIndex {
    index: Index,
    field_feature_id: tantivy::schema::Field,
    field_body: tantivy::schema::Field,
}

impl SearchIndex {
    pub fn build(features: &[Feature]) -> Result<Self, String> {
        let mut sb = Schema::builder();
        let field_feature_id = sb.add_u64_field("feature_id", STORED | FAST);
        let field_body = sb.add_text_field("body", TEXT);
        let schema = sb.build();
        let index = Index::create_in_ram(schema);
        let mut writer = index.writer(50_000_000).map_err(|e| e.to_string())?;
        for feature in features {
            let Some(fid) = numeric_id(feature) else { continue };
            let body = props_to_text(feature);
            if body.is_empty() { continue }
            writer.add_document(doc!(field_feature_id => fid, field_body => body))
                .map_err(|e| e.to_string())?;
        }
        writer.commit().map_err(|e| e.to_string())?;
        Ok(Self { index, field_feature_id, field_body })
    }

    pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<(u64, f32)>, String> {
        let reader = self.index.reader().map_err(|e| e.to_string())?;
        let searcher = reader.searcher();
        let qp = QueryParser::for_index(&self.index, vec![self.field_body]);
        let query = qp.parse_query(query_str).map_err(|e| e.to_string())?;
        let top = searcher.search(&query, &tantivy::collector::TopDocs::with_limit(limit))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::with_capacity(top.len());
        for (score, addr) in top {
            let doc: TantivyDocument = searcher.doc(addr).map_err(|e| e.to_string())?;
            if let Some(fid) = doc.get_first(self.field_feature_id).and_then(|v| v.as_u64()) {
                out.push((fid, score));
            }
        }
        Ok(out)
    }
}

fn numeric_id(feature: &Feature) -> Option<u64> {
    match &feature.id {
        Some(geojson::feature::Id::Number(n)) => n.as_u64(),
        _ => None,
    }
}

fn props_to_text(feature: &Feature) -> String {
    let Some(props) = &feature.properties else { return String::new() };
    props.values()
        .filter_map(|v| match v {
            Value::String(s) => Some(s.clone()),
            Value::Number(n) => Some(n.to_string()),
            Value::Bool(b) => Some(b.to_string()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join(" ")
}
```

---

### Task 4: Add `search_index` to `SourceEntry`

**File:** `src-tauri/src/state.rs`

```rust
use crate::search::SearchIndex;
use std::sync::Arc;

pub struct SourceEntry {
    pub source: Source,
    pub store: Option<Arc<FeatureStore>>,
    pub search_index: Option<Arc<SearchIndex>>,
}
```

---

### Task 5: Build index in `source_add` and add `source_search` command

**File:** `src-tauri/src/commands/source.rs`

In `source_add`, after the `store` is built:

```rust
let search_index = match &store {
    Some(fs) => match SearchIndex::build(fs.features()) {
        Ok(idx) => Some(Arc::new(idx)),
        Err(e) => { eprintln!("search index failed: {}", e); None }
    },
    None => None,
};
let entry = SourceEntry { source, store, search_index };
```

New command:

```rust
#[derive(Serialize, Debug)]
pub struct SearchResult {
    pub feature_id: u64,
    pub score: f32,
    pub label: String,
    pub bbox: Option<[f64; 4]>,
}

#[tauri::command]
pub async fn source_search(
    id: String,
    query: String,
    limit: usize,
    storage: State<'_, SourceStorage>,
) -> Result<Vec<SearchResult>, String> {
    let (search_index, feature_store) = {
        let store = storage.store.lock().unwrap();
        let entry = store.get(&id).ok_or_else(|| format!("Not found {}", id))?;
        let idx = entry.search_index.clone()
            .ok_or_else(|| "No search index".to_string())?;
        let fs = entry.store.clone()
            .ok_or_else(|| "No feature store".to_string())?;
        (idx, fs)
    };
    let hits = search_index.search(&query, limit)?;
    Ok(hits.into_iter().map(|(fid, score)| {
        let feature = feature_store.get_feature_by_id(fid);
        SearchResult {
            feature_id: fid,
            score,
            label: feature.map(|f| extract_label(f, fid)).unwrap_or_else(|| fid.to_string()),
            bbox: feature.and_then(|f| libsphere::feature_bbox(f).map(|(w,s,e,n)| [w,s,e,n])),
        }
    }).collect())
}

const LABEL_KEYS: &[&str] = &["name", "title", "label"];

fn extract_label(feature: &geojson::Feature, fallback: u64) -> String {
    let Some(props) = &feature.properties else { return fallback.to_string() };
    for key in LABEL_KEYS {
        if let Some(Value::String(s)) = props.get(*key) {
            if !s.is_empty() { return s.clone() }
        }
    }
    props.values().find_map(|v| if let Value::String(s) = v { Some(s.clone()) } else { None })
        .unwrap_or_else(|| fallback.to_string())
}
```

---

### Task 6: Register module and command

**File:** `src-tauri/src/main.rs`

```rust
mod search;  // add after mod state;
```

In `generate_handler!`:
```rust
commands::source::source_search,
```

---

## Frontend

### Task 7: Add `SearchResult` type and `search()` to `SourceReader`

**File:** `src/lib/source-reader.ts`

```typescript
export type SearchResult = {
    feature_id: number
    score: number
    label: string
    bbox: [number, number, number, number] | null
}

// inside SourceReader class:
public async search(query: string, limit: number): Promise<SearchResult[]> {
    return invoke<SearchResult[]>("source_search", { id: this.id, query, limit })
}
```

---

### Task 8: Create `SourceSearch` component

**File:** `src/components/LeftSidebar/SourceSearch.tsx`

- Mantine `Combobox` + `TextInput` (size `xs`)
- Debounce: 300 ms via `useRef<ReturnType<typeof setTimeout>>`
- Only renders when a source is selected (`state.selection.sourceId`)
- On result click: dispatch `actions.map.fitBounds({ mapId: MAP_ID, bounds: result.bbox })`

```tsx
import { MAP_ID } from "@/const"
import { SourceReader, type SearchResult } from "@/lib/source-reader"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { Combobox, TextInput, useCombobox } from "@mantine/core"
import type { LngLatBoundsLike } from "maplibre-gl"
import { useRef, useState } from "react"

const LIMIT = 10
const DEBOUNCE = 300

export function SourceSearch() {
    const dispatch = useAppDispatch()
    const sourceId = useAppSelector(state => state.selection.sourceId)
    const combobox = useCombobox()
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchResult[]>([])
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleChange = (value: string) => {
        setQuery(value)
        if (timer.current) clearTimeout(timer.current)
        if (!value.trim() || !sourceId) {
            setResults([])
            combobox.closeDropdown()
            return
        }
        timer.current = setTimeout(async () => {
            const hits = await new SourceReader(sourceId).search(value.trim(), LIMIT)
            setResults(hits)
            hits.length > 0 ? combobox.openDropdown() : combobox.closeDropdown()
        }, DEBOUNCE)
    }

    if (!sourceId) return null

    return (
        <Combobox
            store={combobox}
            onOptionSubmit={val => {
                const hit = results.find(r => String(r.feature_id) === val)
                if (hit?.bbox) {
                    dispatch(actions.map.fitBounds({
                        mapId: MAP_ID,
                        bounds: hit.bbox as LngLatBoundsLike,
                    }))
                }
                combobox.closeDropdown()
            }}
        >
            <Combobox.Target>
                <TextInput
                    size="xs"
                    placeholder="Search features…"
                    value={query}
                    onChange={e => handleChange(e.currentTarget.value)}
                />
            </Combobox.Target>
            <Combobox.Dropdown>
                <Combobox.Options>
                    {results.map(r => (
                        <Combobox.Option key={r.feature_id} value={String(r.feature_id)}>
                            {r.label}
                        </Combobox.Option>
                    ))}
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    )
}
```

---

### Task 9: Insert `<SourceSearch />` in `SourcesTab`

**File:** `src/components/LeftSidebar/SourcesTab.tsx`

Import and place between `<ActionBar ... />` and `<StyledAccordion ...>`:

```tsx
import { SourceSearch } from "./SourceSearch"

// between ActionBar and StyledAccordion:
<SourceSearch />
```

---

## Critical Files

| File                                                | Change                                               |
|-----------------------------------------------------|------------------------------------------------------|
| `src-tauri/Cargo.toml`                              | Add tantivy dep                                      |
| `crates/libsphere/src/store.rs`                     | Add `feature_bbox` pub fn, `get_feature_by_id` method|
| `crates/libsphere/src/lib.rs`                       | Re-export `feature_bbox`                             |
| `src-tauri/src/search.rs`                           | New — `SearchIndex`, `SearchResult`, tantivy logic   |
| `src-tauri/src/state.rs`                            | Add `search_index` field to `SourceEntry`            |
| `src-tauri/src/commands/source.rs`                  | Update `source_add`, add `source_search` command     |
| `src-tauri/src/main.rs`                             | Add `mod search`, register command                   |
| `src/lib/source-reader.ts`                          | Add `SearchResult` type, `search()` method           |
| `src/components/LeftSidebar/SourceSearch.tsx`       | New — search input + dropdown component              |
| `src/components/LeftSidebar/SourcesTab.tsx`         | Insert `<SourceSearch />`                            |

---

## Verification

1. `cargo test -p libsphere` — existing tests still pass after `feature_bbox` / `get_feature_by_id` additions
2. `cargo build` from `src-tauri/` — no compile errors
3. `npm run tauri dev` — load a GeoJSON file, type in the search box, verify dropdown appears with feature labels
4. Click a result — map flies to that feature's bounds
5. `npm test` — TypeScript unit tests pass
