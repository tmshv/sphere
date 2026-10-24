# Source tree: composite sources with child sources

## Problem

Sphere assumes one file = one source. `addFile` makes one `source_add` call, which produces one
`Source` (and one `FeatureStore` for feature-based formats), and the Sources outline
(`apps/sphere/src/components/SourcesOutline/index.tsx`) renders `state.source.allIds` as a flat
list.

Two file formats already break that assumption:

- **MBTiles** holds several vector layers. Today they are all drawn together: the source keeps
  them in `VectorSource.sourceLayers`, and `selectPreviewLayerSpecs` (`store/preview.ts`) draws
  every one of them. The user cannot look at one vector layer without the others.
- **KMZ** (next branch, not this one) holds several KML documents, each a complete source with its
  own features, schema and attribute table. An Organic Maps backup has `doc.kml` (links only),
  `files/My Places.kml` (284 placemarks) and `files/Untitled.kml` (1334 placemarks).

On top of that, the Sources tab only ever shows the one selected source on the map, so the user
cannot compare sources against each other.

## Intent

Turn the Sources outline into a file tree. A file is a node; what the file contains are its
children. Every node has a visibility toggle, and the Sources tab draws everything visible, the
same way the Layers tab draws every visible layer. The user reorders the tree by drag and drop.

MBTiles vector layers are the first children. The model must also fit KMZ documents, which are a
different kind of child, without redesign.

## Goals

- A generic tree of source nodes of arbitrary depth in the `source` slice.
- MBTiles vector sources show one child per vector layer (from TileJSON `vector_layers`).
- A visibility toggle (bulb) on every node, matching the Layers outline. A parent's bulb hides its
  whole subtree.
- The Sources tab draws preview geometry for every visible node, not just the selected one.
- Drag-and-drop reordering in the outline. Draw order follows tree order (top of the tree is drawn
  on top).
- Expand/collapse per parent node, remembered for the session.
- Selection stored as `selectedIds: Id[]`, ready for multi-select later.

## Non-goals

- KMZ support. KMZ comes on its own branch afterwards; this design only has to fit it.
- Multi-select UI. The store holds an array; the UI only ever writes one id into it. No
  cmd/shift-click, no multi-row summaries, no bulk actions.
- Persisting tree, visibility or expanded state across app restarts.
- Fixing HTML5 drag-and-drop in the Layers outline on Windows (see "Drag and drop" below).
- Backend (Rust) changes. MBTiles children come from TileJSON the frontend already fetches.

## Anti-goals

- Coupling the tabs. Sources-tab visibility must never change what the Layers tab shows, and a
  layer's bulb must never change what the Sources tab shows. Each tab is its own view of the app.
- Highlighting the selected source on the map. Selecting a row draws nothing extra; only selected
  *features* are highlighted, as today.
- Breaking file drop from Finder. `tauri://drag-drop` (with `dragDropEnabled` left at its default,
  on) must keep working.
- A child that can drift away from the file it belongs to. A child knows it is a piece of its
  parent: it cannot be dragged out of its parent and cannot be removed on its own.

## Decisions

### Node kinds

Every node in the tree is one of three kinds. All three carry `id`, `name`, `parentId?`,
`visible`.

| Kind           | Data of its own                     | MapLibre source                   | Example                                |
| -------------- | ----------------------------------- | --------------------------------- | -------------------------------------- |
| `source`       | yes: an entry in `items`            | its own `<Source>`                | GeoJSON, CSV, MBTiles file, KMZ doc    |
| `source-layer` | no: a view into its parent `source` | the parent's, plus `source-layer` | `roads` inside an MBTiles file         |
| `folder`       | no: grouping only                   | none                              | `files/` inside a KMZ (later)          |

`items` keeps the existing `Source` union; a `source` node and its `items` entry share the id.

- A `source` node may be a root or a child. A child `source` (a KMZ document later) is a full
  source with its own feature store, selection, attribute table and layers, but it records its
  `parentId` and obeys the child rules below.
- A `source-layer` node always has a `source` parent of type MVT (vector, not raster). Its id is
  `${parentId}/${sourceLayerId}`. It stores `sourceLayer` (the vector layer id).
- `folder` is part of the model and reducer (with tests) but nothing creates one in this PR.

Builder's call: the exact TypeScript shape (one discriminated union in a new `tree` part of the
`source` slice, or a separate `sourceTree` slice). It must stay within the `source` domain and keep
`items: Record<Id, Source>` usable by the many existing readers.

### Tree structure in the store

- Ordering: `rootIds: Id[]` plus an ordered `children: Id[]` per parent node. This replaces the
  unused source `fractionIndex` (layers keep theirs).
- New sources start visible, with all children visible. Assistant's call: they are inserted at
  the **top** of `rootIds`, so they draw on top. This is a visible change: today the reducers
  `allIds.push(id)`, so new sources appear at the bottom, despite the `NEW_SOURCE_INDEX = 0`
  comment saying "top of the list".
- `expanded` state per parent node. Assistant's call (not discussed): new parents start
  **expanded** so the user sees the children appear.
- `selectedIds: Id[]` replaces `selectedId`. A selector `selectSelectedId` (first element) stays so
  the ~20 existing readers (`rect-select*.ts`, `menu.ts`, `load-source-info.ts`, `SourcePanel`,
  `useFeatureState`, …) keep working; each is migrated to resolve what it needs from the selected
  node (see "Resolving a selected node").
- Removing a node removes its whole subtree (and the `items` entries of any `source` nodes in it).
  `auto-select-on-delete` picks the next sibling, else previous sibling, else the parent.

### Child rules

- A child (any kind with a `parentId`) can be reordered among its siblings only. It cannot be
  dragged to another parent or to the root.
- Root nodes can be reordered among roots. Moving a root into a folder is allowed by the model
  (needed for KMZ grouping later) but the outline in this PR only offers reordering, since no
  folders exist yet. Assistant's call: the `move` reducer accepts `{ ids, parentId?, index }` and rejects
  moves that break the child rules, so the rule lives in one place.
- "Remove source" is disabled when the selected node is a child. The user hides a child with its
  bulb, or removes the whole file.

### Visibility and preview

- `visible: boolean` per node. Effective visibility = the node and every ancestor are visible.
- On the Sources tab, `selectPreviewLayerSpecs` walks the tree in order and emits preview specs for
  every effectively visible node:
  - `source` GeoJSON/FeatureCollection → point/line/polygon, as today.
  - `source` MVT raster → one raster layer, as today.
  - `source` MVT vector → nothing itself; its `source-layer` children emit point/line/polygon with
    `sourceLayer` set, as the current per-`sourceLayers` loop does.
  - `folder` → nothing itself.
- Layer ids stay `preview-${sourceId}-{geometry}` and `preview-${sourceId}-${sourceLayer}-{geometry}`.
- Every visible node uses the same preview style (`PREVIEW_COLOR`, `PREVIEW_RADIUS`), as the user
  asked for one design across all sources. Assistant's call: no per-node colours in this PR; the
  value of "show everything visible" is spatial context, not colour coding.
- Draw order: tree top drawn on top. MapLibre draws later layers on top, so specs are emitted in
  reverse tree order (or ordered with `beforeId`; builder's call).
- `map-body.tsx` keeps hiding user layers on the Sources tab whenever any preview is drawn
  (today: whenever `previewSourceId` is defined). The condition becomes "Sources tab is active and
  at least one node is effectively visible", builder's call on the exact predicate.

### Selection, hover and feature selection

- Selecting a row only changes `selectedIds` and the "Source" panel. Nothing extra is drawn.
- Hover (feature properties popup) works **only on the selected node**: `selectPreviewLayerIds`
  returns the preview layer ids of the selected node's subtree, not of every visible node. For a
  selected MBTiles file that is all of its visible children; for a selected `source-layer` it is
  that child's three layers.
- Feature selection (click-select, rect-select, attribute table) stays single-source, keyed by the
  MapLibre/backend source id, exactly as `selection.sourceId` works today:
  - Selected `source` node → that source.
  - Selected `source-layer` node → the parent's source id, with queries limited to that child's
    preview layers. MapLibre feature-state for MVT needs `{ source, sourceLayer, id }`. Today
    `useFeatureState` sets state on **every** vector layer of the source (`src.sourceLayers`), so
    same-id features in sibling layers light up too. It must change to use the resolved
    `sourceLayer` when the selected node is a `source-layer` (and all child layers when the MVT
    root is selected), reading child layers from the tree rather than `sourceLayers`.
  - Selected `folder` → no feature selection; rect-select does nothing.
- Assistant's call: when the selected node changes and its resolved `{ sourceId, sourceLayer }`
  differs from before, the feature selection is cleared (`selection_clear`). Moving from `roads`
  to `water` must not carry `roads` ids into `water`, and a later "add" rect-select must not mix
  ids from two vector layers.
- Assistant's call: when the selected node is effectively hidden, hover, click-select and
  rect-select do nothing for it (`selectPreviewLayerIds` returns `[]`, and the rect-select
  listeners check effective visibility first). Otherwise GeoJSON rect-select, which is a backend
  spatial query, would select features the user cannot see.
- The `selectOne` / `selectMany` invariants in the `selection` slice are unchanged.

### Resolving a selected node

One selector (e.g. `selectSelectedSourceRef`) turns the selected node into
`{ nodeId, sourceId?, sourceLayer? }` where `sourceId` is the owning data source:

| Selected node  | `sourceId`      | `sourceLayer`  |
| -------------- | --------------- | -------------- |
| `source`       | its own id      | —              |
| `source-layer` | parent's id     | the child's id |
| `folder`       | —               | —              |

Every consumer that today reads `state.source.selectedId` as "the data source" switches to this
selector. This is the single place that knows children point into parents.

### Sources tab actions and menu

| Action                | `source` (root) | `source` (child) | `source-layer`              | `folder` |
| --------------------- | --------------- | ---------------- | --------------------------- | -------- |
| Zoom to               | its bounds      | its bounds       | parent's bounds             | disabled |
| Remove                | subtree         | disabled         | disabled                    | subtree  |
| Show properties table | as today        | as today         | disabled (no feature store) | disabled |
| Add blank layer       | as today        | as today         | parent + `sourceLayer`      | disabled |

"Parent + `sourceLayer`" means a layer with `sourceId` = the parent and `sourceLayer` = the child's
vector layer id.

- Menu context `hasSource` means "the selected node resolves to a `sourceId`". Remove and the
  properties table need finer checks; the frontend sends facts only (per AGENTS.md), so if the
  native menu must disable "Remove Source" for children, that is a new fact (e.g. `canRemoveSource`)
  added to `menu_set_context` and `spec.rs`. Builder's call whether that backend change is worth it
  in this PR or the listener just no-ops; if it is added, that is the one allowed Rust change and
  the `src-tauri` crate version rules apply.
- "Add blank layer" for a `source-layer` sets `sourceLayer` to that child and names the layer after
  it (the vector layer name). For an MVT root, today's
  "auto-set `sourceLayer` when the MVT has exactly one layer" shortcut in `add-blank-layer.ts`
  stays, so single-layer MBTiles files don't regress.
- The Layers tab layer source picker (`LayerPanel`) is unchanged: it lists data sources and offers
  the `sourceLayer` dropdown as today.

### Source panel

- `source` → the existing per-format panel.
- `source-layer` → one vector layer's TileJSON entry: id, description, fields (the per-layer block
  `VectorTilesSourcePanel` renders today, for one layer).
- `folder` → name and child count.

### Tree component and drag and drop

- A new presentational `Tree` component in `@sphere/ui` (`packages/ui/src/Tree/`), fully
  controlled: data, expanded ids, selected ids and visibility come in as props; changes go out as
  callbacks (`onSelect`, `onToggle`, `onMove`, plus whatever row extras need). No Redux inside, per
  the package rules.
- Built on **`react-arborist`** (MIT, ~377k weekly downloads). It uses `react-dnd` 16, which the
  app already depends on, and supports controlled data, multi-select and keyboard navigation.
  Pin an exact version at least two weeks old: 4.0.0 (2026-10-10) qualifies; 4.0.1 (2026-10-11)
  does from 2026-10-25. 4.x is a new major (3.x ended at 3.16.0); it is ESM-only and makes
  `react-dnd` / `react-dnd-html5-backend` peers. Check Vitest handles it; fall back to 3.16.0 if
  4.x causes trouble.
- `packages/ui/package.json` must declare `react-arborist`, `react-dnd`,
  `react-dnd-html5-backend` and `react-dnd-touch-backend` (as peers, like the other UI deps).
  `Outline` already imports `react-dnd` without declaring it; fix that at the same time.
- Rows are custom-rendered: expand chevron, type icon, label, and the shared `VisibilityToggle` bulb
  (also used by the Layers outline) in the right slot. The chevron matches a `SectionStack` header's
  (no hover, rotates when open, same left inset) so the first level lines up under the section
  title; a selected row is tinted edge to edge in the primary colour's light variant. Each file
  type has its own icon, chosen from `sourceKindOf`, the same kind that picks the Source panel.
- react-arborist virtualizes and needs a numeric `height`/`width`: the `Tree` component measures
  its container (e.g. `ResizeObserver` via a small hook) and passes the size in.
- **Pointer-event drag**: pass `react-dnd-touch-backend` with `enableMouseEvents: true` as the
  tree's `dndBackend`, not the HTML5 backend. On Windows, Tauri's file-drop handler
  (`dragDropEnabled`, on by default) swallows in-page HTML5 drag events; pointer events are not
  affected, so file drop from Finder and tree dragging work together on every OS.
- Isolation from the Layers outline's HTML5 backend: in react-dnd 16 a `DndProvider` given only
  a `backend` shares one global manager, and react-arborist passes `backend` unless given a
  `dndManager`. Today the two would never collide only because the sidebar tabs use
  `keepMounted={false}`. The `Tree` creates its own manager (`createDragDropManager` with the
  touch backend) and passes it as `dndManager`, so it is isolated regardless of mounting.
- The drop rules (child rules above) are enforced twice: the tree's `disableDrop` callback stops
  invalid drops visually, and the `move` reducer rejects them as the source of truth.

Fallback if react-arborist turns out not to work (ESM/test trouble, measuring trouble):
`@headless-tree/react`, accepting that it uses native HTML5 drag (fine on macOS, broken on Windows
while `dragDropEnabled` is on).

### Fit check: KMZ later

The KMZ branch will need only:

- a backend command that lists the KML documents in an archive;
- `addFile` for `.kmz` creating a root node for the file (a `folder`-like root, or a `source` for a
  single-document KMZ — decided on that branch) and one child `source` per document with a
  `?entry=<path>` URL (distinct ids come free from `digest(source_url)`), optionally nested under
  `folder` nodes that mirror zip directories;
- nothing new in the tree model, preview, selection or Tree component.

## Testing

Per AGENTS.md, tests come first:

- Reducers: add with/without parent, remove subtree, move within siblings, rejected cross-parent
  moves, visibility, expanded, `selectedIds`.
- Selectors: effective visibility, preview specs order and content for each node kind, preview
  layer ids for hover limited to the selected subtree, the selected-node resolver table above,
  menu context.
- `addFromUrl` MVT: creates one `source-layer` child per vector layer; raster MBTiles gets none.
- `add-blank-layer`: `source-layer` selection sets `sourceId`/`sourceLayer`.
- `auto-select-on-delete`: sibling / parent fallback.
- Selection: changing the selected node to a different `{ sourceId, sourceLayer }` clears the
  feature selection; a hidden selected node yields no hover/rect-select layer ids;
  `useFeatureState` highlights only the resolved `sourceLayer`.
- `Tree` component: renders nesting, expand/collapse, select, bulb callback, `onMove` payloads
  (drag simulation may be limited in jsdom; test the move-mapping logic as a pure function).
- Existing tests that read `source.selectedId`, `allIds` or `sourceLayers` are updated, not deleted.

## Left to the builder

- Exact type and slice layout, action names, selector names.
- Whether `VectorSource.sourceLayers` stays as a derived copy or is replaced by child nodes
  (one place per concept: the tree should be the source of truth for which children exist).
- Measuring hook implementation, row height, indent size, icons per node kind.
- Whether to add the `canRemoveSource` menu fact (see above).
