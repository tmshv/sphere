# Copy Selection (#195)

Copy the currently selected features to the clipboard as GeoJSON or WKT, via `cmd+c`, the command palette, and the map context menu.

## Design

- Selection IDs already live in `SelectionStorage` (Rust). Source ID lives in the frontend (`selectors.selection.sourceId`).
- Backend assembles clipboard text from IDs in Rust; no feature data round-trips through the frontend.
- Frontend passes `sourceId` to the backend command, receives the assembled string, and writes it to the clipboard via `@tauri-apps/plugin-clipboard-manager`.
- A new `settings` slice holds user preferences. No UI yet; values are seeded with defaults and persisted only in Redux (future PRs can add a settings panel and persistence).

## Scope

- GeoJSON and WKT copy for the current selection.
- Entry points: `cmd+c` (GeoJSON, uses settings), command palette (explicit per-format entries), map context menu (explicit per-format entries).
- Silent no-op when selection is empty or source ID is undefined.

## Out of scope

- Settings UI.
- `cmd+c` choosing format based on source type or user toggle (always GeoJSON for now; settings slice in place enables this later).
- Persisting settings across sessions.

## Tasks

### Task 1: Settings slice

- [x] Create `src/store/settings/index.ts` with flat state: `copyWrapAsFeatureCollection: boolean` (default `true`), `copyWktSeparator: string` (default `"\n"`).
- [x] Reducers: `setCopyWrapAsFeatureCollection`, `setCopyWktSeparator`.
- [x] Selectors: `copyWrapAsFeatureCollection`, `copyWktSeparator`.
- [x] Register in `src/store/index.ts` and `src/store/actions.ts` and `src/store/selectors.ts`.
- [x] Unit test for reducers + selectors in `src/store/settings/index.test.ts`.

### Task 2: Backend WKT helper in libsphere

- [x] Add `features_to_wkt(fc: &FeatureCollection, ids: &[i64], separator: &str) -> String` in `crates/libsphere/src/source.rs` (or neighbour module).
- [x] Converts each feature's geometry to WKT and joins with `separator`; skips features whose geometry is missing.
- [x] Unit tests: single point, multi-feature, missing geometry, empty ids.
- [x] Bump `crates/libsphere/Cargo.toml` minor version; run `cargo update -p libsphere` from `src-tauri/`.

### Task 3: Backend copy commands

- [ ] Add `selection_copy_geojson(source_id: String, wrap_fc: bool, source_storage, selection_storage) -> Result<String, String>` in `src-tauri/src/commands/selection.rs`:
  - Reads IDs from `SelectionStorage`.
  - If empty → return `""`.
  - Loads source's `FeatureCollection`, slices by IDs (reuse `libsphere::source::slice_feature_collection`).
  - If `wrap_fc` → serialize the sliced `FeatureCollection`.
  - Else → serialize as a JSON array of Features (or a single Feature when `ids.len() == 1`).
- [ ] Add `selection_copy_wkt(source_id: String, separator: String, source_storage, selection_storage) -> Result<String, String>`:
  - Same ID/source loading; returns `""` on empty selection.
  - Calls `features_to_wkt`.
- [ ] Register both in `src-tauri/src/main.rs`.
- [ ] Rust tests for both commands (or for the underlying helpers they call): empty selection, wrap toggle, WKT separator joining.

### Task 4: Frontend copy helper

- [ ] Create `src/lib/copy-selection.ts` with:
  - `copySelectionAsGeojson(sourceId: string, wrapFc: boolean): Promise<void>`
  - `copySelectionAsWkt(sourceId: string, separator: string): Promise<void>`
- [ ] Each invokes the corresponding Tauri command, skips clipboard write when returned string is empty, otherwise `writeText`.
- [ ] Unit tests mocking `invoke` and `writeText`.

### Task 5: Spotlight entries

- [ ] Add two actions in `src/components/Spotlight/index.tsx`:
  - "Copy selection as GeoJSON"
  - "Copy selection as WKT"
- [ ] Each reads `selectors.selection.sourceId` and `selectors.selection.count` via `useAppSelector`. Returns early when no selection.
- [ ] GeoJSON entry reads `copyWrapAsFeatureCollection` from settings; WKT entry reads `copyWktSeparator`.

### Task 6: Map context menu entries

- [ ] In `src/components/MapContextMenu/index.tsx`, conditionally render two items above "Copy location" when `selection.count > 0` and `selection.sourceId` is set:
  - "Copy selection as GeoJSON"
  - "Copy selection as WKT"
- [ ] Update existing tests and add coverage for conditional rendering based on selection.

### Task 7: cmd+c keyboard handler

- [ ] Extend `src/store/keyboard.ts` to handle `(meta|ctrl)+c`:
  - Skip when `document.activeElement` is `input`, `textarea`, or `isContentEditable`.
  - Skip when selection count is 0 or source ID is undefined.
  - Invoke GeoJSON copy using current `copyWrapAsFeatureCollection` setting.
- [ ] Unit test focus-guard branches and invocation path (mock helper).

### Task 8: Documentation and housekeeping

- [ ] Add `selection_copy_geojson` and `selection_copy_wkt` to the IPC commands table in `CLAUDE.md`.
- [ ] Add a short description of the settings slice under the State Management section in `CLAUDE.md`.
- [ ] Run `npm run format`, `npm run lint`, `npm test`, `cargo test` (from `src-tauri/`).

## Open questions

- None — all questions resolved in the brainstorming round.
