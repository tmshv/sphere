# Draw: in-place editing on a Rust-owned source

## Intent

Draw mode copies the whole source into the `@sphere/draw` instance (`draw.set(fc)`), tracks edits in JS, and diffs on Done. That costs CPU and memory proportional to the source, so large sources cannot be edited. `@sphere/draw` is now vendored, so it can be changed to fit the app.

The goal is to draw on sources of any size. The Rust backend becomes the single owner of the data, state and diffing. The package only draws and reports interaction.

## Goals

- Edits apply in place to the existing `SourceStorage` entry. No second copy of the source.
- Draw holds only a small working set in JS, never the whole source.
- Diff, change tracking, id mapping and undo bookkeeping live in Rust.
- Cancel rolls back. Done commits. Both are cheap and independent of source size.
- The `DRAW_ORIG_ID_KEY` property hack and the JS `ChangeTracker` are removed.

## Non-goals

- Editing file-backed sources that are not in memory (v1; see Calls).
- Rewriting `@sphere/draw` into a stateless input layer (considered, deferred).
- Multi-user or concurrent editing.

## Anti-goals

- Any path that loads or serialises the full source to JS to enter draw mode.
- Silently dropping edits when the working set changes.

## Approaches

1. **Rust source of truth, draw edits a working set (chosen).** Edits are sent to Rust per interaction. Draw keeps only selected or viewport features. Everything else renders through the normal source layer.
2. Stateless draw input layer. Best scaling, but a rewrite of the package's store, render and modes. Deferred.
3. Keep the full copy, diff in Rust. Smallest change, does not fix memory or CPU. Rejected.

## Design

**Rust: edit session** (per source, in `src-tauri`, logic in `libsphere`):
- `draw_begin(source_id)` starts a session. It errors if the source is not in-memory.
- `draw_get_working_set(source_id, scope)` returns GeoJSON for `scope` = selection ids or a bbox, capped at N features.
- `draw_apply(source_id, op)` applies one op in place: `create`, `update`, `delete` (combine and uncombine are expressed as delete plus create). Updates the `FeatureStore` spatial index. On the first touch of a feature it stores the pre-edit copy in a journal. New features get backend ids, returned to the caller so draw can re-key them.
- `draw_commit(source_id)` drops the journal and returns the touched ids. `draw_rollback(source_id)` restores from the journal and rebuilds the index entries.

**Package (`@sphere/draw`)**:
- Gains an id-stable `load(features)` and `unload(ids)` for the working set and keeps events as they are. No whole-source assumptions.
- Stays free of Tauri and Redux; the app forwards its events.

**App**:
- `useDrawControl` forwards `draw.*` events as `draw_apply` calls. `Draw.tsx` loses the tracker and the Done diff. Done calls commit then `bumpVersion`. Cancel calls rollback.
- While a session is active, edited ids are hidden from the base layer with a filter, so they are not drawn twice. On commit or rollback the base source re-fetches.

## Calls (mine, please correct)

- Working set is the selection if any, otherwise the viewport features, with a cap. If the cap is exceeded the user must zoom in. Features already edited stay pinned when the viewport moves.
- v1 supports only in-memory sources, since `source_patch` already has that limit. Draw is disabled with a reason on other sources. Making file-backed sources editable is a separate piece of work.
- One op per interaction event, sent immediately, not batched until Done.
- The cap value, command names and exact op payloads are for the builder.

## Constraints

- Follows AGENTS.md: tests before changes, bump `crates/*` minor version once per PR, logic in listeners and not components, no lint suppressions.
- Package boundaries stay as documented.
