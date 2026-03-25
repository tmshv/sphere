# Design: Move FeatureCollection Sources into Rust Backend (Issue 163)

## Overview

Currently `SourceType.FeatureCollection` sources (pasted from clipboard or created empty) store their feature data in Redux (`source.dataset`). All other source types store data in the Rust backend and fetch via IPC. This inconsistency complicates the draw tool and makes incremental edits impossible.

This design removes `dataset` from Redux and stores all feature data in Rust, accessed via a uniform IPC interface.

## Goals

- Store all feature data in the Rust backend; Redux holds only metadata
- Enable the draw tool to load/save features via IPC for all source types
- Add `source_replace` (full replace) and `source_patch` (incremental diff) commands
- Connect the draw tool to `source_replace` now; `source_patch` is ready for future use

## Architecture

### New `SourceData::InMemory` variant (`crates/libsphere/src/source.rs`)

Add a new variant to `SourceData`:

```rust
SourceData::InMemory(geojson::FeatureCollection)
```

Implement the following for it:
- `to_feature_collection()` — clone and return the stored FC
- `to_geojson()` — serialize via `to_feature_collection()`
- `get_bounds()` — return `None` (bounds are derived from the `FeatureStore`)
- `get_schema()` — delegate to `FeatureStore` (already inferred at store-build time)

Bump `libsphere` minor version (e.g. `0.x.0 → 0.(x+1).0`) and run `cargo update -p libsphere`.

### New Tauri Commands (`src-tauri/src/commands/source.rs`)

#### `source_add_data(name: String, data: String) -> Result<SourceAddResult, String>`

- Parse `data` as `geojson::FeatureCollection`
- Generate a UUID as the source id
- Create `Source { id, name, location: format!("memory://{id}"), data: SourceData::InMemory(fc) }`
- Build `FeatureStore` and store `SourceEntry` in `SourceStorage`
- Return `SourceAddResult { id, name, location, source_type: "geojson" }`

#### `source_replace(id: String, data: String) -> Result<(), String>`

- Lock `SourceStorage`, look up entry by `id`
- Assert the source data is `InMemory` (only in-memory sources are replaceable)
- Parse `data` as `geojson::FeatureCollection`
- Replace `entry.source.data = SourceData::InMemory(new_fc)`
- Rebuild `entry.store = Some(Arc::new(build_feature_store(&entry.source)?))`

#### `source_patch(id: String, patch: SourcePatch) -> Result<(), String>`

`SourcePatch` struct (deserializable from JSON):
```rust
pub struct SourcePatch {
    pub added: Vec<serde_json::Value>,    // new features
    pub updated: Vec<serde_json::Value>,  // features with matching id to replace
    pub deleted: Vec<serde_json::Value>,  // feature IDs (string or number) to remove
}
```

Logic:
1. Lock storage, get mutable `InMemory` FC
2. Apply `deleted`: remove features whose `id` matches any value in `deleted`
3. Apply `updated`: for each entry, find feature with matching `id` and replace it
4. Apply `added`: append new features to the FC
5. Rebuild `FeatureStore`

All three commands are registered in `main.rs` via `tauri::generate_handler!`.

### Frontend Types (`src/types/source.ts`)

**`FeatureCollecionSource`** — remove `dataset`, add `version`, make `location` non-optional:
```ts
export type FeatureCollecionSource = {
    type: SourceType.FeatureCollection
    location: string        // "memory://<id>"
    version: number         // incremented on each replace/patch to trigger re-fetch
    editable: true
    pending: false
    meta: SourceMetadata
}
```

**`PendingFeatureCollecionSource`** — remove `dataset?: GeoJSON.FeatureCollection`.

### Frontend Source Slice (`src/store/source/index.ts`)

**Removed:**
- `addFeatureCollection` reducer (stored `dataset` in Redux)
- `setData` reducer (updated `dataset`)
- `extraReducer` for `draw.done` that patched `source.dataset`

**Added:**
- `addInMemorySource({ id, name, location, meta })` — creates a `FeatureCollectionSource` with `version: 0`, `pending: false`
- `bumpVersion(id: Id)` — increments `version` on the named source; called after `source_replace` or `source_patch` succeeds

### Frontend Draw Slice (`src/store/draw.ts`)

Change `done` payload:
```ts
// before
done: PayloadAction<{ sourceId: Id; featureCollection: GeoJSON.FeatureCollection }>
// after
done: PayloadAction<{ sourceId: Id }>
```

`featureCollection` was only used by the source slice's `extraReducer` to update `dataset`. Both are removed together.

### Frontend Thunks

**`addFromClipboard.ts`:**
1. Parse clipboard text into a `GeoJSON.FeatureCollection` (existing logic unchanged)
2. `await invoke("source_add_data", { name: "Pasted GeoJSON", data: JSON.stringify(fc) })`
3. Compute `meta` via `computeGeometryMeta(fc)`
4. `dispatch(addInMemorySource({ id, name, location, meta }))`

**`empty.ts`:**
1. Build an empty FC string: `'{"type":"FeatureCollection","features":[]}'`
2. `await invoke("source_add_data", { name, data: emptyFc })`
3. `dispatch(addInMemorySource({ id, name, location, meta: emptyMeta }))`

### Frontend `SphereSource.tsx`

**`selectSource` selector** — `FeatureCollection` case returns `null` (data fetched async, same as `Geojson`).

**Component** — `FeatureCollection` and `Geojson` both render `<Source id={id} type="geojson" data={geojsonData} />`.

Two `useEffect` hooks sharing one `geojsonData` state:
```tsx
// Existing: fetch on mount for Geojson sources
useEffect(() => {
    if (sourceType !== SourceType.Geojson) return
    invoke<string>("source_get", { id }).then(json => setGeojsonData(JSON.parse(json))).catch(() => {})
}, [id, sourceType])

// New: fetch on mount and on every version bump for FeatureCollection sources
useEffect(() => {
    if (version === null) return   // not a FeatureCollection
    invoke<string>("source_get", { id }).then(json => setGeojsonData(JSON.parse(json))).catch(() => {})
}, [id, version])
```

`version` is selected from Redux:
```tsx
const version = useAppSelector(state => {
    const s = state.source.items[id]
    if (s?.type === SourceType.FeatureCollection && !s.pending) return s.version
    return null
})
```

### Frontend `Draw.tsx`

**On enter** (when `sourceId` changes and is defined):
```ts
const fc = JSON.parse(await invoke<string>("source_get", { id: sourceId }))
draw.set(fc)
```
Replace the current Redux `source.dataset` selector with this IPC call.

**On Done:**
```ts
await invoke("source_replace", { id: sourceId, data: JSON.stringify(draw.getAll()) })
dispatch(actions.source.bumpVersion(sourceId))
dispatch(actions.draw.done({ sourceId }))
dispatch(actions.tools.reset())
```

The draw component no longer reads from `state.source.items[sourceId].dataset`.

## Data Flow After Change

```
Clipboard paste / New empty source
    → addFromClipboard / empty thunk
    → invoke("source_add_data", { name, data })   [Rust stores InMemory FC, returns { id, location }]
    → dispatch(addInMemorySource({ id, name, location, meta }))   [Redux holds metadata only]
    → SphereSource mounts, useEffect fires
    → invoke("source_get", { id })                [Rust serializes InMemory FC to JSON]
    → MapLibre renders features

Draw edit
    → invoke("source_get", { id })                [load into draw tool]
    → user edits
    → invoke("source_replace", { id, data })      [Rust replaces InMemory FC, rebuilds FeatureStore]
    → dispatch(bumpVersion(id))                   [Redux increments version]
    → SphereSource useEffect re-fires
    → invoke("source_get", { id })                [re-fetch updated data]
    → MapLibre re-renders
```

## Testing

- `addFromClipboard.test.ts` — mock `@tauri-apps/api/core` (`invoke`), replace mocked `addFeatureCollection` with `addInMemorySource`; test that IPC is called with correct GeoJSON and metadata action is dispatched
- `empty.ts` — add tests following the same pattern
- `SphereSource.test.ts` — add test that `selectSource` returns `null` for `FeatureCollection` type
- Rust unit tests for `source_add_data`, `source_replace`, `source_patch`

## Out of Scope

- Source type rename / format field (tracked separately)
- Switching draw tool to `source_patch` (infrastructure is added; wiring happens in a follow-up)
