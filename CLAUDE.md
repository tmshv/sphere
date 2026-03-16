# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sphere is a geospatial data visualization and editing desktop application built with Tauri (Rust backend) and React/TypeScript (frontend) using MapLibre GL for map rendering. It supports loading GeoJSON, Shapefile, CSV, GPX, and MBTiles formats.

## Git Conventions

- Branch names use the format `issue-XX` (e.g. `issue-79`)
- Commit messages are single-line
- PR descriptions contain only a short summary of what was done (no test plan section)

## Build & Development Commands

```bash
# Frontend development
npm run dev              # Start Vite dev server (port 1420)
npm run build            # Build frontend (tsc && vite build)
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm test                 # Run Vitest tests
npm run coverage         # Test coverage report

# Tauri (full app)
npm run tauri dev        # Run app in development mode
npm run tauri build      # Build production app

# Versioning
npm version patch         # Bump version in package.json, tauri.conf.json, Cargo.toml, and Cargo.lock
```

## Testing Policy

Before modifying any code file, check whether it has tests. All code must be covered by tests before making changes. If tests are missing, write them first, then implement the change.

## Code Style

- Double quotes, no semicolons, 4-space indentation
- Trailing commas in multiline structures
- Unix line endings
- No `_underscore` prefix for private/local variables
- Use `function Component({ prop }: ComponentProps) {}` syntax for React components, not arrow functions
- Use maplibre types (`MapEventType`, `MapLayerEventType`, `Listener`, etc.) when working with map event handlers

## Architecture

### Frontend (`src/`)

**State Management**: Redux Toolkit with listener middleware for side effects. Key slices:
- `app` - UI state (dark theme, sidebar visibility)
- `layer` - Layer management and styling
- `source` - Data source management
- `selection` - Selected map features
- `draw` - Drawing mode state
- `map` / `mapStyle` / `projection` - Map viewport and rendering

**Component Structure**:
- `components/SphereMap/` - Map rendering with react-map-gl/MapLibre
- `components/LeftSidebar/` - Sources and layers management
- `store/effects/` - Side effects (file loading, etc.)
- `ui/` - Reusable UI components (built on Mantine)

### Backend (`src-tauri/`)

Tauri app with async Rust backend (Tokio). Commands in `src/commands/`:
- `source.rs` - Load sources, get GeoJSON, schema, bounds, MBTiles tiles
- `system.rs` - System utilities (show in finder)

State stored in `SourceStorage` (thread-safe HashMap with Mutex).

### Rust Libraries (`crates/`)

- `libsphere` - Geospatial processing (format parsing, bounds calculation)
- `mbtiles` - MBTiles tile database reader
- `tilejson` - TileJSON spec support

### Data Flow

1. Files loaded via Tauri dialog → processed in Rust (`add-file.ts` effect)
2. Sources stored in `SourceStorage`, sent to frontend as GeoJSON
3. Redux state drives React rendering → MapLibre renders layers

## Key Dependencies

- **Frontend**: React 18, Redux Toolkit, react-map-gl 8, MapLibre GL 5, Mantine 5, Turf.js
- **Backend**: Tauri 2.9, rusqlite (bundled SQLite), geo/geojson/geozero/wkt crates

## Runtime Requirements

- Node 22 (managed via Mise)
- Rust 1.92

## Tauri Integration Patterns

**IPC Communication**: Frontend invokes Rust commands via `@tauri-apps/api` `invoke()` function.

**Custom Protocols**: The app registers custom URL protocols for accessing sources:
- `sphere://source{path}` - Access loaded geospatial sources
- `sphere://mbtiles{path}` - Access MBTiles tile data

**CSV source URI params**: When loading CSV files, the `sphere://source` URI accepts query parameters: `?x=<field>&y=<field>` for lon/lat column names (defaults: `lng`/`lat`), `?wkt=<field>` for a WKT geometry column. When a source is stored, features are assigned integer IDs starting from 1 (after the max existing numeric ID). Original string IDs are preserved in `properties["$id"]`.

**Event System**: Tauri events handle:
- Theme changes (system dark/light mode)
- Drag-and-drop file handling

**Plugins Used**: fs, dialog, http, clipboard

## IPC Commands

Available Tauri commands (invoked from frontend via `invoke()`):

| Command | Description |
|---------|-------------|
| `source_add` | Load a source from URL/path |
| `source_get` | Get source as GeoJSON string |
| `source_bounds` | Get geographic bounds [west, south, east, north] |
| `source_get_schema` | Get property schema: `{ columns: Record<string,string>, points_count, lines_count, polygons_count }` |
| `mbtiles_get_tile` | Get single tile from MBTiles |
| `mbtiles_get_metadata` | Get MBTiles metadata/TileJSON |
| `show_in_finder` | Open file location in system explorer |

## Important Build Constraints

**esbuild target must be es2022+**: Both `build.target` and `optimizeDeps.esbuildOptions.target` in `vite.config.ts` must remain `es2022` or higher. Lower targets cause esbuild to inject `__publicField` helper calls into `maplibre-gl`, breaking its Web Worker blob creation at runtime. `tsconfig.json` `useDefineForClassFields` must stay `false` to match. CI checks the build output for this regression. Verified with maplibre-gl 5.20.0: `__publicField` still absent from build output, so the constraint remains necessary. Check again when upgrading. See [#102](https://github.com/tmshv/sphere/issues/102).

## Known Issues / Technical Debt

1. **Error handling** - Error types discard context (e.g., `From<io::Error>` returns generic variant without details)
2. **Unsafe unwraps** - URL parsing and UTF-8 conversion use `.unwrap()` which can panic
3. **Fake async** - Some commands marked `async` but perform blocking I/O
4. **Memory leaks** - Event listeners in `src/tauri.ts` don't store unlisten functions for cleanup
5. **Missing plugin** - `tauri_plugin_shell` in Cargo.toml but not registered in main.rs
6. **CSP disabled** - `tauri.conf.json` has `"csp": null` (security concern for production)
7. **No type sharing** - TypeScript and Rust types are duplicated and can drift out of sync
8. **Busy-wait polling** - `waitEvent()` in `src/lib/tauri.ts` uses inefficient polling loop
