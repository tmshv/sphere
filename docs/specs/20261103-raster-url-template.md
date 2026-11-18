# Raster source from a URL template (issue #283, level 1)

## Intent

Sphere can add raster sources only from the built-in `BASEMAPS`. The user should be able to paste an XYZ or WMS GetMap URL template and get a `Raster` source with a linked raster layer, exactly as basemaps are added today. This is the first step towards WMS support (level 2, GetCapabilities client), where it stays as the "Advanced: raw URL" escape hatch. WMS matters because it is what will make custom projections usable: a WMS server renders a tile for any bbox in any CRS it supports, while XYZ tiles are Web Mercator only.

## Goals

- "Add Raster from URL…" entry in the command palette and in the native File menu, opening one dialog
- Accept XYZ templates (`{z}`, `{x}`, `{y}`) and WMS templates (`{bbox-epsg-3857}` or `{bbox}`)
- Validate the template live in the dialog; the Add button is disabled while it is invalid, and the reason is shown
- Default source name derived from the template, overridable in the dialog

## Non-goals

- GetCapabilities, layer picking, axis order, `ServiceException` parsing, tile proxying through `sphere://` (level 2)
- Registering custom projections; Sphere has only `mercator` and `globe` today
- `{quadkey}`, `{-y}`, TMS scheme, `{ratio}`/`{r}` retina tokens
- Editing the template of an existing source

## Anti-goals

- Accepting a template that would render misaligned tiles under the active projection
- Losing the user's typed template: the dialog keeps it until submit or explicit close

## Validation rules

Validation is a pure function `parseRasterTemplate(template, crs)` in `apps/sphere/src/lib/raster-template.ts`. `crs` is the CRS of the active projection, from `projectionCrs(projection)` in `apps/sphere/src/lib/projection.ts` (a lookup table: `mercator` and `globe` map to `EPSG:3857`).

1. Trimmed, non-empty, parses as an absolute `http:` or `https:` URL
2. Kind detection on the raw string:
   - WMS if it contains `{bbox-epsg-3857}` or `{bbox}`
   - XYZ if it contains all of `{z}`, `{x}`, `{y}`
   - Both or neither: invalid ("needs a tile token")
3. XYZ: valid only when `crs` is `EPSG:3857` (XYZ tiles are Web Mercator)
4. WMS:
   - The `SRS` or `CRS` query parameter (parameter names case-insensitive, value compared case-insensitively) must be present and equal `crs`
   - `{bbox-epsg-3857}` is valid only when `crs` is `EPSG:3857`
   - `WIDTH` and `HEIGHT` must be present, positive integers, and equal; the value becomes `tileSize`
5. The template is stored as typed (trimmed). `new URL()` is used only to read the host and parameters, because it percent-encodes `{` and `}` in the path

Result on success: `{ kind: "xyz" | "wms", name, tiles: RasterTiles }` where

- `name`: XYZ → host; WMS → `host/LAYERS` (host only when `LAYERS` is empty or absent)
- `tiles.urls`: `[template]`
- `tiles.tileSize`: 256 for XYZ, `WIDTH` for WMS
- `tiles.maxzoom`: 19 for XYZ, 22 for WMS
- `tiles.attribution`: `""`

On failure: `{ error: string }`, a short human message shown under the field.

## Flow

- `app` slice gains `rasterUrlDialogOpen: boolean` with `openRasterUrlDialog` / `closeRasterUrlDialog`
- Command palette command `add-raster-url` and native menu item `file.add-raster-url` ("Add Raster from URL…", `Requires::Always`) dispatch `openRasterUrlDialog`
- `RasterUrlDialog` (mounted once in `App`) holds the typed template and name in local state, shows the validation result, and on submit dispatches `source.addRasterFromUrl({ template, name? })` and closes
- The `add-raster-url` listener re-validates against the current projection (a failed parse dispatches the app error), then adds the raster source with `location` = template and a raster layer below every existing layer. The "add raster + layer below" step is shared with the `add-basemap` listener through one helper

## Decided by the builder (my calls)

- Layer placement below everything, same as basemaps
- Name format `host/LAYERS`
- Max zoom defaults 19 / 22, no field for it in the dialog
- `EPSG:900913` and other aliases are not accepted
