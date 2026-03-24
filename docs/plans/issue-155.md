# Plan: Raster MBTiles Support (Issue #155)

## Context

MBTiles files can contain either vector tiles (PBF) or raster tiles (PNG/JPEG/WebP). Currently all `.mbtiles` files are treated as `SourceType.MVT`, causing raster MBTiles to silently fail. The `format` metadata key is read from SQLite but discarded before reaching the frontend.

`SourceType.Raster` is reserved for future TIFF support. Raster MBTiles stay as `SourceType.MVT` but gain a `format` field so the rendering layer can distinguish vector vs raster.

## Files to Modify

| File                                            | Change                                                       |
|-------------------------------------------------|--------------------------------------------------------------|
| `crates/tilejson/src/lib.rs`                    | Add `format: Option<String>` field to `Tilejson3`            |
| `crates/mbtiles/src/mbtiles.rs`                 | Wire `meta.format` into the TileJSON output                  |
| `src/types/tilejson.ts`                         | Add `format?` field to `TileJSON` type                       |
| `src/types/source.ts`                           | Add `format` field to `VectorSource`                         |
| `src/store/source/index.ts`                     | Accept `format` in `addMVTSource` payload, store it          |
| `src/store/source/addFromUrl.ts`                | Read `tilejson.format`, pass to `addMVTSource`               |
| `src/components/SphereMap/SphereSource.tsx`     | Use `type: "raster"` MapLibre source when format is raster   |
| `src/lib/sphere-protocol.ts`                    | Add `"image"` case for raster tile requests                  |

## Steps

### Task 1: Expose `format` from Rust TileJSON
**File:** `crates/tilejson/src/lib.rs`

- [x] Add `format: Option<String>` field to `Tilejson3` struct.
- [x] Initialize as `None` in `Tilejson3::new()`.
- [x] Add `set_format(&mut self, value: String)` method.
- [x] Include `"format": self.format` in `as_json()`.
- [x] Add test `test_set_format` confirming round-trip through `as_json()`.

### Task 2: Wire format into MBTiles TileJSON
**File:** `crates/mbtiles/src/mbtiles.rs`

- [x] After the while loop (line 138), before `tilejson.set_zoom(...)`, add:
```rust
if let Some(fmt) = meta.format {
    tilejson.set_format(fmt);
}
```
No other backend changes needed — `mbtiles_get_metadata` already serializes the full JSON.

### Task 3: Add `format` to TypeScript TileJSON type
**File:** `src/types/tilejson.ts`

- [ ] Add optional field:
```typescript
format?: "pbf" | "png" | "jpg" | "webp"
```

### Task 4: Add `format` to `VectorSource` type
**File:** `src/types/source.ts`

- [ ] Add `format` field:

```typescript
export type VectorSource = {
    type: SourceType.MVT
    tilejson: TileJSON
    location: string
    format: "pbf" | "png" | "jpg" | "webp"
    editable: false
    sourceLayers: { id: string; name: string }[]
    pending: false
}
```

### Task 5: Accept `format` in `addMVTSource` reducer
**File:** `src/store/source/index.ts`

- [ ] Add `format` to the `addMVTSource` payload type and store it on the source item:

```typescript
addMVTSource: (
    state,
    action: PayloadAction<{
        id: Id
        name: string
        location: string
        tilejson: TileJSON
        format: "pbf" | "png" | "jpg" | "webp"
        sourceLayers?: { name: string; id: string }[]
    }>,
) => {
    const { id, name, location, tilejson, format, sourceLayers } = action.payload
    state.items[id] = {
        id,
        name,
        location,
        type: SourceType.MVT,
        format,
        // ...
    }
```

### Task 6: Pass `format` from TileJSON in `addFromUrl`
**File:** `src/store/source/addFromUrl.ts`

- [ ] In the `SourceType.MVT` case, read `tilejson.format` and pass it through. Fall back to `"pbf"` when absent (older/non-conformant files):

```typescript
const RASTER_FORMATS = new Set<TileJSON["format"]>(["png", "jpg", "webp"])
const format = tilejson.format ?? "pbf"
const sourceLayers = RASTER_FORMATS.has(format)
    ? []
    : (tilejson.vector_layers ?? []).map(({ id }) => ({ id, name: id }))
thunkAPI.dispatch(
    actions.addMVTSource({ id, name, location, tilejson, format, sourceLayers }),
)
```

`add-file.ts` requires **no changes**.

### Task 7: Render raster MVT as a MapLibre raster source
**File:** `src/components/SphereMap/SphereSource.tsx`

- [ ] Define the raster formats constant and branch on `source.format` in both selector and JSX render:
```typescript
const RASTER_MVT_FORMATS = new Set(["png", "jpg", "webp"] as const)
```

In the `SourceType.MVT` branch of `selectSource` and the JSX render, branch on `source.format`:

```typescript
case SourceType.MVT: {
    if (RASTER_MVT_FORMATS.has(source.format)) {
        return {
            id,
            type: "raster",
            url: `sphere://mbtiles/${id}`,
        } as SourceProps
    }
    return {
        id,
        type: "vector",
        url: `sphere://mbtiles/${id}`,
    } as SourceProps
}
```

Same branching in the JSX render function:
```tsx
case SourceType.MVT: {
    if (RASTER_MVT_FORMATS.has(source.format)) {
        return <Source id={id} type="raster" url={`sphere://mbtiles/${id}`} />
    }
    return <Source id={id} type="vector" url={`sphere://mbtiles/${id}`} />
}
```

MapLibre will request TileJSON via `type: "json"` (already handled), then fetch individual tiles via `type: "image"` for raster sources.

### Task 8: Handle raster tile requests in SphereProtocol
**File:** `src/lib/sphere-protocol.ts`

- [ ] Add `"image"` case to `handleMbtiles` switch (same implementation as `"arrayBuffer"`):

```typescript
case "image": {
    const [z, x, y] = this.parseZXY(url)
    const bytes = await reader.getTile({ z, x, y })
    if (!bytes) {
        return null
    }
    return bytes.buffer
}
```

## What Does NOT Change

- `src/store/effects/add-file.ts` — still dispatches `SourceType.MVT` for `.mbtiles`
- `src/types/index.ts` — `SourceType` enum unchanged
- `src-tauri/src/commands/source.rs` — already serializes full TileJSON
- `src/components/SphereMap/SphereLayer.tsx` — `LayerType.Raster` already works

## Verification

1. Open a raster MBTiles → renders on map as a raster layer
2. Open a vector MBTiles → existing behavior unchanged
3. `npm test` passes
4. `npm run lint` passes
5. `npm run format` applied
