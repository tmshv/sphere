# Plan: Move FeatureCollection Sources into Rust Backend (Issue 163)

## Context

`SourceType.FeatureCollection` sources (clipboard paste, new empty) store GeoJSON data in Redux (`source.dataset`). All other source types store data only in Rust and read it via IPC. This inconsistency means the draw tool has a special code path for FeatureCollection, making incremental edits impossible and the architecture incoherent.

This plan removes `dataset` from Redux, stores all feature data in Rust via a new `SourceData::InMemory` variant, and unifies the IPC access pattern. The draw tool is connected to a new `source_replace` command (full replace); a `source_patch` (incremental diff) command is added for future use.

Spec: `docs/superpowers/specs/2026-03-25-issue-163-inmemory-sources-design.md`

---

## Tasks

### Task 1: Add `SourceData::InMemory` to libsphere
- [x] `crates/libsphere/src/source.rs` — add `InMemory(geojson::FeatureCollection)` to `SourceData` enum
- [x] Implement `to_feature_collection()` for `InMemory`: clone the stored FC and return it (no need to call `assign_feature_ids` here — IDs are assigned at storage time in `source_add_data`/`source_replace`)
- [x] Implement `get_bounds()` for `InMemory`: return `None` (the `FeatureStore` always provides bounds for InMemory sources)
- [x] Implement `get_schema()` for `InMemory`: return `Err("use FeatureStore".into())` (FeatureStore is always present; `source_get_schema` uses `entry.store` first)
- [x] `crates/libsphere/Cargo.toml` — bump version `0.2.0` → `0.3.0`
- [x] Run `cargo update -p libsphere` from workspace root to update lock file

### Task 2: Add new Tauri commands
- [x] `src-tauri/Cargo.toml` — add `uuid = { version = "1", features = ["v4"] }` for UUID generation
- [x] `src-tauri/src/commands/source.rs` — add `SourcePatch` struct:
  ```rust
  #[derive(serde::Deserialize, Debug)]
  pub struct SourcePatch {
      pub added: Vec<serde_json::Value>,
      pub updated: Vec<serde_json::Value>,
      pub deleted_ids: Vec<serde_json::Value>,
  }
  ```
- [x] Add `source_add_data(name: String, data: String, storage: State<'_, SourceStorage>) -> Result<SourceAddResult, String>`:
  - Parse `data` as `geojson::FeatureCollection` (reject non-FC with error — frontend always sends a FC)
  - Call `assign_feature_ids(&mut fc)` (reuse `libsphere::schema::assign_feature_ids`)
  - Generate UUID: `uuid::Uuid::new_v4().to_string()`
  - Create `Source { id, name, location: format!("memory://{id}"), data: SourceData::InMemory(fc) }`
  - Build `FeatureStore`, store `SourceEntry`, return `SourceAddResult { id, name, location, source_type: "geojson".into() }`
- [x] Add `source_replace(id: String, data: String, storage: State<'_, SourceStorage>) -> Result<(), String>`:
  - Lock storage for the entire operation (replace + rebuild)
  - Get mutable entry, assert `SourceData::InMemory`
  - Parse `data` as `geojson::FeatureCollection`
  - Call `assign_feature_ids(&mut new_fc)` to normalize IDs
  - Replace `entry.source.data = SourceData::InMemory(new_fc)`
  - Rebuild: `entry.store = Some(Arc::new(build_feature_store(&entry.source)?))`
- [x] Add `source_patch(id: String, patch: SourcePatch, storage: State<'_, SourceStorage>) -> Result<(), String>`:
  - Lock storage for the entire operation
  - Get mutable `InMemory` FC
  - Apply `deleted_ids`: remove features whose `.id` field matches any value in `deleted_ids`
  - Apply `updated`: find feature with matching `.id` and replace in-place
  - Apply `added`: parse and append new features
  - Rebuild `FeatureStore`
- [x] `src-tauri/src/main.rs` — register `source_add_data`, `source_replace`, `source_patch` in `tauri::generate_handler!`

### Task 3: Update TypeScript types
- [x] `src/types/source.ts`:
  - `FeatureCollecionSource`: remove `dataset: GeoJSON.FeatureCollection`, add `version: number`, change `location?: string` → `location: string`
  - `PendingFeatureCollecionSource`: remove `dataset?: GeoJSON.FeatureCollection` (type stays; becomes vestigial)

### Task 4: Update source slice
- [x] `src/store/source/index.ts`:
  - Remove `addFeatureCollection` reducer
  - Remove `setData` reducer
  - Remove `extraReducer` for `drawSlice.actions.done` (was updating `source.dataset`)
  - Add `addInMemorySource({ id, name, location, meta })` reducer — creates `FeatureCollectionSource` with `version: 0`, `pending: false`
  - Add `bumpVersion(id: Id)` reducer — increments `version` for the named source
- [x] `src/store/source/index.test.ts`:
  - Remove tests for `addFeatureCollection` and `setData`
  - Add tests for `addInMemorySource` (verify `version: 0`, `pending: false`, `location`, `meta`)
  - Add test for `bumpVersion` (verify `version` increments)

### Task 5: Update draw slice
- [x] `src/store/draw.ts` — change `done` payload from `{ sourceId: Id; featureCollection: GeoJSON.FeatureCollection }` to `{ sourceId: Id }` (the FC is no longer passed through Redux)
- [x] `src/store/draw.test.ts` — update `done` action tests to use payload `{ sourceId: "s1" }` only (remove `featureCollection` from test payloads)

### Task 6: Update addFromClipboard thunk and tests
- [x] `src/store/source/addFromClipboard.ts`:
  - After building the `GeoJSON.FeatureCollection` (existing `toFeatureCollection` logic unchanged)
  - Replace `const id = crypto.randomUUID(); dispatch(actions.addFeatureCollection(...))` with:
    ```ts
    const result = await invoke<{ id: string; name: string; location: string }>(
        "source_add_data",
        { name: "Pasted GeoJSON", data: JSON.stringify(dataset) }
    )
    const meta = computeGeometryMeta(dataset)
    thunkAPI.dispatch(actions.addInMemorySource({ id: result.id, name: result.name, location: result.location, meta }))
    ```
- [x] `src/store/source/addFromClipboard.test.ts` — rewrite all positive test assertions:
  - Mock `@tauri-apps/api/core` (`invoke`) to return `{ id: "test-id", name: "Pasted GeoJSON", location: "memory://test-id" }`
  - Replace mock of `addFeatureCollection` with mock of `addInMemorySource`
  - For each test case assert: `invoke` called with `"source_add_data"` and the correct `data` JSON string (feature count/geometry types), and `addInMemorySource` called with correct `meta`
  - Negative-path tests: assert `invoke` was NOT called instead of `addFeatureCollection`

### Task 7: Update empty thunk
- [x] `src/store/source/empty.ts`:
  - Replace direct `dispatch(actions.addFeatureCollection(...))` with IPC call:
    ```ts
    const emptyData = JSON.stringify({ type: "FeatureCollection", features: [] })
    const result = await invoke<{ id: string; name: string; location: string }>(
        "source_add_data",
        { name, data: emptyData }
    )
    thunkAPI.dispatch(actions.addInMemorySource({ id: result.id, name: result.name, location: result.location, meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 } }))
    ```
  - Change to `createAsyncThunk` since it now needs `await`

### Task 8: Update SphereSource.tsx
- [x] `src/components/SphereMap/SphereSource.tsx`:
  - `selectSource` — `FeatureCollection` case: return `null` (data fetched async; remove `source.dataset` reference at line 24)
  - Add `version` selector:
    ```tsx
    const version = useAppSelector(state => {
        const s = state.source.items[id]
        if (s?.type === SourceType.FeatureCollection && !s.pending) return s.version
        return null
    })
    ```
  - Add second `useEffect` for FeatureCollection (watches `[id, version]`):
    ```tsx
    useEffect(() => {
        if (version === null) return
        invoke<string>("source_get", { id })
            .then(json => setGeojsonData(JSON.parse(json)))
            .catch(() => {})
    }, [id, version])
    ```
  - JSX `FeatureCollection` case: change from `<Source ... data={source.dataset ?? EMPTY_GEOJSON} />` to `<Source id={id} type="geojson" data={geojsonData} />` (remove `source.dataset` reference at line 91)
- [x] `src/components/SphereMap/SphereSource.test.ts` — add test: `selectSource` returns `null` for `FeatureCollection` type

### Task 9: Update Draw.tsx
- [x] `src/components/SphereMap/Draw.tsx`:
  - Remove the Redux selector that reads `source.dataset` (the `data` selector, lines 18–31)
  - Add a `useEffect` to load features on enter:
    ```tsx
    useEffect(() => {
        if (!sourceId) return
        invoke<string>("source_get", { id: sourceId })
            .then(json => draw.set(JSON.parse(json)))
            .catch(() => {})
    }, [sourceId, draw])
    ```
  - Update `onDone` callback:
    ```tsx
    const onDone = useCallback(async () => {
        if (!sourceId) return
        await invoke("source_replace", {
            id: sourceId,
            data: JSON.stringify(draw.getAll()),
        })
        dispatch(actions.source.bumpVersion(sourceId))
        dispatch(actions.draw.done({ sourceId }))
        dispatch(actions.tools.reset())
    }, [dispatch, sourceId, draw])
    ```
  - Remove the old `useEffect` that called `draw.set(data)` on data change

### Task 10: Update zoom-to.ts listener
- [ ] `src/store/listeners/zoom-to.ts`:
  - `FeatureCollection` case: replace `turf.bbox(source.dataset)` with `SourceReader.getBounds()`:
    ```ts
    case SourceType.FeatureCollection: {
        const reader = new SourceReader(sourceId)
        const bounds = await reader.getBounds()
        if (bounds) {
            listenerApi.dispatch(actions.map.fitBounds({ mapId, bounds }))
        }
        break
    }
    ```

---

## Key Files

| File | Change |
|------|--------|
| `crates/libsphere/src/source.rs`                        | Add `SourceData::InMemory` variant |
| `crates/libsphere/Cargo.toml`                           | Bump `0.2.0` → `0.3.0` |
| `src-tauri/Cargo.toml`                                  | Add `uuid` crate |
| `src-tauri/src/commands/source.rs`                      | Add 3 new commands + `SourcePatch` |
| `src-tauri/src/main.rs`                                 | Register new commands |
| `src/types/source.ts`                                   | Remove `dataset`, add `version` |
| `src/store/source/index.ts`                             | Replace `addFeatureCollection`/`setData` with `addInMemorySource`/`bumpVersion` |
| `src/store/source/index.test.ts`                        | Update reducer tests |
| `src/store/draw.ts`                                     | Simplify `done` payload |
| `src/store/draw.test.ts`                                | Update `done` tests |
| `src/store/source/addFromClipboard.ts`                  | IPC call instead of direct Redux dispatch |
| `src/store/source/addFromClipboard.test.ts`             | Rewrite assertions |
| `src/store/source/empty.ts`                             | IPC call instead of direct Redux dispatch |
| `src/components/SphereMap/SphereSource.tsx`             | Async fetch for FeatureCollection |
| `src/components/SphereMap/SphereSource.test.ts`         | Add FeatureCollection selector test |
| `src/components/SphereMap/Draw.tsx`                     | IPC load/save instead of Redux data |
| `src/store/listeners/zoom-to.ts`                        | Use SourceReader.getBounds() |

## Reusable utilities

- `libsphere::schema::assign_feature_ids` — used in `source_add_data` and `source_replace` to normalize feature IDs
- `libsphere::FeatureStore::from_features` — reused by all three new commands via `build_feature_store()`
- `src/lib/source-reader.ts` `SourceReader.getBounds()` — reused in `zoom-to.ts` for FeatureCollection
- `src/store/source/index.ts` `computeGeometryMeta` — reused in `addFromClipboard.ts` for meta

---

## Verification

```bash
# 1. Frontend unit tests
npm test

# 2. TypeScript compilation
npm run build

# 3. Lint
npm run lint

# 4. Rust compilation
cd src-tauri && cargo build

# 5. Full app smoke test
npm run tauri dev
# - Paste GeoJSON from clipboard → source appears on map
# - Create empty source → source appears in list
# - Click Edit on a FeatureCollection source → draw tool loads features
# - Edit features and click Done → map re-renders with updated features
# - Zoom-to on a FeatureCollection source → map fits to bounds
```
