# Draw In-Place Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Edit a source in place from draw mode with the Rust backend owning data, diffing and undo, so draw works on sources of any size.

**Architecture:** An edit session in `libsphere` wraps the in-memory feature collection: each op mutates the `FeatureStore` incrementally (no rebuild) and journals the pre-edit feature on first touch. Tauri commands expose begin / working set / apply / commit / rollback. `@sphere/draw` holds only a working set (selection, else viewport, capped); the app forwards draw events as ops and hides edited ids from the base layer.

**Tech Stack:** Rust (libsphere, Tauri 2, rstar), TypeScript, Redux Toolkit listeners, `@sphere/draw`, Vitest.

**Spec:** `docs/specs/20261113-draw-in-place-editing.md`

## Global Constraints

- Tests are written before each code change (AGENTS.md Testing Policy). Run `npm run format` after frontend edits.
- Bump `crates/libsphere` minor version once for the whole PR and run `cargo update -p libsphere` from `src-tauri/`.
- Only in-memory sources are editable in v1; others are rejected with an error and draw is disabled with a reason.
- No whole-source load into JS in draw mode. No lint suppression comments, no `any`, no non-null assertions.
- `@sphere/draw` must not import Tauri or Redux.
- A refinement of the spec: new features keep their draw-side id; the Rust session holds the draw id to backend id alias map, so the package never re-keys.

## Review Focus

- Cancel after create, update and delete of the same feature in one session restores the original exactly.
- Deleting a feature just created in the session leaves no trace after commit and none after rollback.
- A session on an empty source, and a working set query over an empty bbox, return empty results, not errors.
- `draw_begin` twice on one source, or `draw_apply` with no session, errors cleanly instead of corrupting state.
- Source deleted or replaced while a session is open ends the session and draw mode (existing `exit-draw-on-source-delete`).

---

### Task 1: Incremental FeatureStore edits
- [ ] Write failing tests in `crates/libsphere/src/store.rs` (and `index.rs`) for: `upsert(feature)` makes it findable by `query_rect` and updates bounds; `remove(id)` makes it unfindable; a removed feature's slot is tombstoned so other indices stay valid; `get_by_ids(&[i64]) -> Vec<Feature>` skips missing ids.
- [ ] Run `cargo test -p libsphere`; confirm the new tests fail.
- [ ] Add `fn remove(&mut self, idx: usize, bbox: Bbox)` to `SpatialIndex` and `RstarIndex` (rstar `RTree::remove` with the stored envelope).
- [ ] Add `FeatureStore::upsert(&mut self, feature: Feature) -> Option<Feature>` (returns the previous version), `FeatureStore::remove(&mut self, id: i64) -> Option<Feature>`, `FeatureStore::get_by_ids(&self, ids: &[i64]) -> Vec<Feature>`, backed by an `id -> idx` map; deletes tombstone the slot and exclude it from `features()`, `feature_count`, paging and `query_rect`.
- [ ] Bump `crates/libsphere` minor version in `Cargo.toml`; run `cargo update -p libsphere` from `src-tauri/`.
- [ ] Run `cargo test -p libsphere`; confirm pass. Commit.

### Task 2: EditSession with journal
- [ ] Write failing tests in new `crates/libsphere/src/edit.rs`: create then rollback leaves the store as before; update then rollback restores the old geometry and properties; delete then rollback restores the feature; create then delete then rollback and commit both leave no trace; commit returns the touched ids; an alias for a draw id resolves to the same backend id on later ops.
- [ ] Run `cargo test -p libsphere edit`; confirm fail.
- [ ] Implement `pub struct EditSession` with `EditSession::new() -> Self`, `apply(&mut self, store: &mut FeatureStore, op: EditOp) -> Result<Option<i64>, SphereError>`, `commit(self) -> Vec<i64>`, `rollback(self, store: &mut FeatureStore)`. Define `pub enum EditOp { Create { draw_id: String, feature: Feature }, Update { id: EditRef, feature: Feature }, Delete { id: EditRef } }` where `EditRef` is a backend `i64` or a draw-id `String`. The journal stores the pre-edit `Feature` on first touch only; new backend ids come from the store's next free numeric id.
- [ ] Run `cargo test -p libsphere`; confirm pass. Commit.

### Task 3: Tauri draw commands
- [ ] Write failing tests in `src-tauri/src/commands/draw.rs` (use `test_app()` style from `source.rs` tests): `draw_begin` errors on a non-in-memory source and on a second begin; `draw_apply` errors without a session; `draw_get_working_set` with `Scope::Ids` and `Scope::Bbox`, and the cap returning an `over_cap: true` flag with no features; `draw_commit` and `draw_rollback` end the session; a removed source ends the session.
- [ ] Run `cargo test -p sphere draw`; confirm fail.
- [ ] Add `sessions: Mutex<HashMap<String, EditSession>>` to `src-tauri/src/state.rs`. Implement commands `draw_begin(id) -> ()`, `draw_get_working_set(id, scope: WorkingScope, cap: usize) -> WorkingSet { features: String, over_cap: bool }`, `draw_apply(id, op: EditOp) -> Option<i64>`, `draw_commit(id) -> Vec<i64>`, `draw_rollback(id) -> Vec<i64>` (touched ids, so the app can refresh them). Register in `main.rs`. `FeatureStore` is behind `Arc` today: make it mutably reachable through `SourceEntry` without cloning the whole set.
- [ ] Keep selection state valid after commit and rollback (clear ids that no longer exist).
- [ ] Run `cargo test` in `src-tauri/`; confirm pass. Commit.

### Task 4: @sphere/draw working-set API
- [ ] Write failing tests in `packages/draw/src/api.test.ts`: `load(fc)` adds features with their given ids and emits no `draw.create`; `unload(ids)` removes them without emitting `draw.delete` and clears them from selection; loading an id twice replaces it.
- [ ] Run `npm test -w @sphere/draw`; confirm fail.
- [ ] Implement `load(fc: FeatureCollection): void` and `unload(ids: FeatureId[]): void` in `packages/draw/src/api.ts`, silent by design. Keep `set`, `add` and `delete` unchanged.
- [ ] Run `npm test -w @sphere/draw` and `npm run lint`; confirm pass. Commit.

### Task 5: App session bridge
- [ ] Write failing tests for `apps/sphere/src/lib/draw-session.ts`: `eventToOps(event: DrawEvent): EditOp[]` maps create, update, delete, and combine/uncombine (delete plus create); `invoke` wrappers `beginDraw`, `loadWorkingSet`, `applyOp`, `commitDraw`, `rollbackDraw` call the matching commands.
- [ ] Run `npm test -w @sphere/app draw-session`; confirm fail.
- [ ] Implement `draw-session.ts` (pure mapping in `eventToOps`, thin `invoke` wrappers). Update `useDrawControl.ts` to call `applyOp` for each op, serialised in order, and surface errors through the existing `fail` listener.
- [ ] Run the tests; confirm pass. Commit.

### Task 6: Draw.tsx and listeners
- [ ] Update tests: `save-draw.test.ts` (commit calls `draw_commit` then `bumpVersion`, rollback path calls `draw_rollback`), `start-draw.test.ts` (calls `draw_begin`, fails closed on a non-in-memory source), `exit-draw-on-source-delete.test.ts` (session ended).
- [ ] Run the three tests; confirm fail.
- [ ] Rewrite `Draw.tsx`: begin the session, load the working set (selection ids, else viewport bbox with the cap; on `over_cap`, show a "zoom in to edit" notice; on `moveend`, load newly visible features and keep edited ones pinned). Remove `ChangeTracker`, `onDone` diffing, and the full-set `draw.set`. Done dispatches `draw.commit({ sourceId })`; Cancel dispatches a new `draw.cancel({ sourceId })` handled by `save-draw.ts` via `draw_rollback`.
- [ ] Run the tests; confirm pass. Commit.

### Task 7: Hide edited ids from the base layer
- [ ] Write failing tests for a selector `selectDrawHiddenIds` and its use in the layer filter (combined via `combineFilters` with the user filter) in `apps/sphere/src/store/` and `SphereMap`: while a session is open, ids touched or loaded into draw are excluded; after commit or rollback the filter is gone and `bumpVersion` has re-fetched.
- [ ] Run the tests; confirm fail.
- [ ] Add `draw.hiddenIds` to the `draw` slice (filled from the working set and from created ids), the selector, and the filter wiring.
- [ ] Run the tests; confirm pass. Commit.

### Task 8: Cleanup and docs
- [ ] Remove `DRAW_ORIG_ID_KEY` from `const.ts`, delete `lib/draw-source.ts` and its test, and remove `source_patch` only if nothing else uses it (`rg source_patch`); otherwise keep it.
- [ ] Update `AGENTS.md`: draw data flow, new IPC commands in the table, `libsphere` edit session, package `load`/`unload`.
- [ ] Run `npm run format`, `npm run lint`, `npm test`, `npm run build`, and `cargo test` in `src-tauri/`; all must pass.
- [ ] Move `docs/plans/20261113-draw-in-place-editing.md` to `docs/plans/completed/` when finished. Commit.
