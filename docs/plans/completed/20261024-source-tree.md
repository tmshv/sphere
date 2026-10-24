# Source Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Sources outline into a drag-and-drop tree of source nodes with per-node visibility, with MBTiles vector layers as the first children.

**Architecture:** The `source` slice gains a tree (`nodes`, `rootIds`, `expandedIds`, `selectedIds`) next to the existing `items`. Pure helpers in `src/lib/source-tree.ts` own tree rules (subtree, effective visibility, move validity). One resolver selector turns the selected node into `{ nodeId, sourceId?, sourceLayer? }`; every consumer that meant "the selected data source" reads it. A new controlled `Tree` in `@sphere/ui` wraps react-arborist with a pointer-event (touch) react-dnd backend.

**Tech Stack:** React 18, Redux Toolkit 2, MapLibre 6 via react-map-gl 8, Mantine 5, react-arborist 4.0.0, react-dnd 16 + react-dnd-touch-backend 16.0.1, Vitest.

**Spec:** `docs/specs/20261024-source-tree.md`

## Global Constraints

- No Rust changes in this PR (no crate bumps needed). The `canRemoveSource` menu fact is **not** added; the menu listener no-ops instead.
- Tabs are independent: Sources-tab node visibility never affects the Layers tab and vice versa.
- No map highlight for the selected row; only selected features are highlighted.
- `tauri://drag-drop` file drop keeps working; `dragDropEnabled` stays at its default.
- All visible nodes use `PREVIEW_COLOR` / `PREVIEW_RADIUS`; no per-node colours.
- Child node id = `${parentId}/${sourceLayerId}`.
- New roots go to the **top** of `rootIds`, start visible, children visible, parent expanded.
- A child (any node with `parentId`) cannot be moved to another parent or removed on its own.
- `selectedIds: Id[]`; the UI only ever writes zero or one id.
- Pin exact versions: `react-arborist@4.0.0`, `react-dnd-touch-backend@16.0.1`.
- AGENTS.md rules: tests first; no `!`, `any`, untyped `as`, nested ternaries, magic literals, suppression comments; logic in listeners/selectors; `npm run format` after every code change; one-line commit messages.
- `VectorSource.sourceLayers` **stays** as the file's declared vector layers (Layers-tab data, used by `LayerPanel`). Tree nodes are the Sources-tab view of them (order, visibility). Assistant's call, resolving the spec's open point.
- Subtree removal removes `items` for every `source` node in the subtree, but the layer slice only unbinds layers whose `sourceId` equals the removed root id. That is enough here (MBTiles children have no items); the KMZ branch must extend it.

## Review Focus

- MBTiles vector file with empty `vector_layers` → root node with no children, no expand chevron, preview draws nothing, no crash. Test in Task 2.
- Adding a source whose id already exists (re-opening the same file) → node updated in place, `rootIds` and `allIds` contain the id once. Test in Task 2.
- Vector layer id containing `/` or spaces (e.g. `"land use"`) → child id `${parentId}/land use` is used verbatim as a map key and in preview layer ids; nothing splits on `/`. Test in Task 1 (`collectSubtree` uses `children`, never string parsing).
- Selected node hidden by toggling its parent's bulb → hover, click and rect-select do nothing and do not clear an existing selection. Test in Task 5.
- Removing an MBTiles file while one of its children is selected → selection moves to the next root sibling, feature selection cleared, layers bound to the file unbound. Test in Task 6.

---

### Task 1: Tree types and pure helpers

**Files:**
- Create: `apps/sphere/src/types/source-tree.ts`
- Create: `apps/sphere/src/lib/source-tree.ts`
- Test: `apps/sphere/src/lib/source-tree.test.ts`
- Modify: `apps/sphere/src/types/index.ts` (re-export)

**Interfaces:**
- Produces (types):
  ```ts
  type SourceNodeBase = { id: Id; name: string; parentId?: Id; visible: boolean; children: Id[] }
  export type SourceNode =
      | (SourceNodeBase & { kind: "source" })
      | (SourceNodeBase & { kind: "source-layer"; sourceLayer: string })
      | (SourceNodeBase & { kind: "folder" })
  export type SourceNodeKind = SourceNode["kind"]
  export type SourceNodes = Record<Id, SourceNode>
  export type SelectedSourceRef = { nodeId: Id; sourceId?: Id; sourceLayer?: string }
  ```
- Produces (functions in `lib/source-tree.ts`):
  - `childLayerNodeId(parentId: Id, sourceLayer: string): Id`
  - `collectSubtree(nodes: SourceNodes, id: Id): Id[]` — id first, then descendants depth-first in `children` order; `[]` for unknown id
  - `isEffectivelyVisible(nodes: SourceNodes, id: Id): boolean` — node and all ancestors visible; `false` for unknown id
  - `walkTree(nodes: SourceNodes, rootIds: Id[]): SourceNode[]` — depth-first, tree order, skips unknown ids
  - `canMove(nodes: SourceNodes, ids: Id[], parentId: Id | undefined, index: number): boolean` — every id exists; each id's current `parentId` equals the target `parentId` **or** the id is a root moving into a `folder`; target parent (if any) is a `folder` or the ids' current parent; no id is the target parent or its ancestor; `index` within `0..siblings.length`
  - `resolveSourceRef(nodes: SourceNodes, nodeId: Id): SelectedSourceRef` — the table in the spec ("Resolving a selected node")
  - `siblingsOf(nodes: SourceNodes, rootIds: Id[], id: Id): Id[]`

- [ ] Write `source-tree.test.ts`: `childLayerNodeId("abc", "land use") === "abc/land use"`; `collectSubtree` on root→[child a, child b] returns `["root", "a", "b"]`, unknown → `[]`; `isEffectivelyVisible` false when parent hidden and child visible; `walkTree` order for two roots with children; `canMove` true for reorder within same parent, false for child → root, false for child → other parent, true for root → folder, false for folder into its own descendant, false for out-of-range index; `resolveSourceRef` for `source` (`{ nodeId, sourceId: nodeId }`), `source-layer` (`{ nodeId, sourceId: parentId, sourceLayer }`), `folder` (`{ nodeId }`).
- [ ] Run `npm test -w @sphere/app -- source-tree`; expect FAIL (module missing).
- [ ] Implement types and helpers.
- [ ] Run the test; expect PASS. Run `npm run format`.
- [ ] Commit: `git commit -m "Add source tree types and helpers"`

### Task 2: Tree state in the source slice

**Files:**
- Modify: `apps/sphere/src/store/source/index.ts`
- Modify: `apps/sphere/src/types/source.ts` (drop `fractionIndex` from `Source`)
- Modify: `apps/sphere/src/testutils.ts` (drop `fractionIndex`; add `makeSourceState(...)` helper building `items`/`allIds`/`nodes`/`rootIds` from a list of sources)
- Test: `apps/sphere/src/store/source/index.test.ts`

**Interfaces:**
- Consumes: Task 1 types and helpers.
- Produces — state:
  ```ts
  type SourceState = {
      items: Record<string, Source>; allIds: Id[]; lastAdded?: Id
      nodes: SourceNodes; rootIds: Id[]; expandedIds: Id[]; selectedIds: Id[]
  }
  ```
  `selectedId` is removed. `allIds` stays as the unordered index of `items`.
- Produces — reducers (all on `sourceSlice.actions`):
  - existing `addGeojsonSource`, `addInMemorySource`, `addRasterSource`, `addMVTSource` also upsert a root `source` node at index 0 of `rootIds` (in place if the id exists; no duplicate in `rootIds`/`allIds`). `addMVTSource` with non-raster `format` creates one `source-layer` child per `sourceLayers` entry (`childLayerNodeId`, `name: sl.name`, `sourceLayer: sl.id`, visible) and adds the root to `expandedIds` when it has children.
  - `addFolder(p: { id: Id; name: string; parentId?: Id })`
  - `select(id: Id | undefined)` → `selectedIds = id ? [id] : []`
  - `removeSource(id: Id)` → no-op if node has `parentId`; else removes `collectSubtree` from `nodes`, `rootIds`, `expandedIds`, `selectedIds`, and `items`/`allIds` for `source` nodes in it; clears `lastAdded` if removed
  - `setVisible(p: { id: Id; value: boolean })`
  - `setExpanded(p: { id: Id; value: boolean })`
  - `move(p: { ids: Id[]; parentId?: Id; index: number })` → no-op unless `canMove`; reorders/reparents preserving the order of `ids`
  - `setName` also renames the node
  - `reset` clears tree state too
- Produces — slice selectors: `nodes`, `rootIds`, `expandedIds`, `selectSelectedIds`, `selectSelectedId` (= `selectedIds.at(0)`, a node id).

- [ ] Update `index.test.ts` first: initial state has empty tree fields; each `add*` creates a root node at `rootIds[0]` (second add goes before the first); `addMVTSource({ format: "pbf", sourceLayers: [{id:"roads",name:"roads"},{id:"water",name:"water"}] })` creates children `id/roads`, `id/water` in that order and expands the root; raster `format: "png"` creates no children; empty `sourceLayers` creates no children and does not expand; re-adding an existing id leaves `rootIds`/`allIds` with one entry; `removeSource(rootId)` drops the root, its children, its `items` entry, and clears `selectedIds` containing any of them; `removeSource(childId)` is a no-op; `move` reorders roots; `move` of a child to root is a no-op; `setVisible`, `setExpanded`, `select(undefined)` → `[]`; `addFolder` under nothing creates a root folder. Replace old `selectedId`/`fractionIndex` assertions.
- [ ] Run `npm test -w @sphere/app -- store/source/index`; expect FAIL.
- [ ] Implement the state and reducers (use Task 1 helpers; no tree logic inline).
- [ ] Run the test; expect PASS.
- [ ] Keep the build green: mechanically replace raw `state.source.selectedId` reads with `sourceSlice.selectors.selectSelectedId(state)` and drop `fractionIndex` from source literals (for root nodes the node id equals the source id, so behaviour is unchanged; Task 3 refines the meaning). Update tests that build `source` state by hand to use `makeSourceState`. Run `npm run typecheck` and `npm test -w @sphere/app`; expect clean/PASS.
- [ ] Run `npm run format`. Commit: `git commit -m "Add source tree state to source slice"`

### Task 3: Selected node resolver and reader migration

**Files:**
- Create: `apps/sphere/src/store/source/tree-selectors.ts`
- Test: `apps/sphere/src/store/source/tree-selectors.test.ts`
- Modify (replace `state.source.selectedId` / `selectors.source.selectSelectedId` used as "data source"): `store/source/index.ts` (`selectCurrentSourceItem`), `store/selectors.ts`, `store/menu.ts`, `store/listeners/menu.ts`, `store/listeners/selection-changed.ts`, `store/listeners/load-source-info.ts`, `store/listeners/rect-select.ts`, `store/listeners/rect-select-mvt.ts`, `store/source/showProperties.ts`, `store/sourceInfo/selectors.ts`, `components/SourcePanel/index.tsx`, `components/SourcePanel/CsvSourcePanel.tsx`, `components/SphereMap/RectSelectOverlay.tsx`, `components/LeftSidebar/SourcesTab.tsx`, `sphere-hooks/useFeatureState.ts`
- Tests touched by the migration (already on `makeSourceState` after Task 2): `rect-select.test.ts`, `load-source-info.test.ts`, `selectors.test.ts`, `useFeatureState.test.tsx`, `sourceInfo/selectors.test.ts`, `SourcePanel/*.test.*`, `LeftSidebar/*.test.tsx`, `menu*.test.ts`.

**Interfaces:**
- Consumes: Task 1 `resolveSourceRef`, `isEffectivelyVisible`; Task 2 state.
- Produces (exported from `tree-selectors.ts`, added to `selectors.source`):
  - `selectSelectedNode(state): SourceNode | undefined`
  - `selectSelectedSourceRef(state): SelectedSourceRef | undefined`
  - `selectSelectedSourceId(state): Id | undefined` — the owning data source id
  - `selectSelectedSourceLayer(state): string | undefined`
  - `selectSelectedInteractive(state): boolean` — resolved `sourceId` exists **and** selected node effectively visible
- `selectCurrentSourceItem` now uses `selectSelectedSourceId`.
- `selectMenuContext.hasSource` = `Boolean(selectSelectedSourceId(state))`.

- [ ] Write `tree-selectors.test.ts`: the three resolver rows; `selectSelectedInteractive` false when parent hidden, false for folder, true for visible root.
- [ ] Run; expect FAIL. Implement; run; expect PASS.
- [ ] Migrate every listed reader to `selectSelectedSourceId` (data source) or `selectSelectedId` (node id: outline highlight, auto-select). Behaviour for root `source` nodes must be unchanged.
- [ ] Add one test per migrated store reader with a selected `source-layer` node where it matters: `selectMenuContext().hasSource === true`, `selectCurrentSourceItem` returns the parent MVT. Run `npm test -w @sphere/app`; expect all PASS. Run `npm run typecheck`; expect clean.
- [ ] Run `npm run format`. Commit: `git commit -m "Resolve selected source node through one selector"`

### Task 4: Tree-driven preview

**Files:**
- Modify: `apps/sphere/src/store/preview.ts`
- Modify: `apps/sphere/src/store/selectors.ts` (`preview` group)
- Modify: `apps/sphere/src/components/SphereMap/map-body.tsx`
- Test: `apps/sphere/src/store/selectors.test.ts` (`selectPreviewLayerSpecs`, `selectPreviewLayerIds`, new `selectPreviewActive`)

**Interfaces:**
- Consumes: Task 1 `walkTree`, `isEffectivelyVisible`, `collectSubtree`; Task 3 `selectSelectedSourceRef`, `selectSelectedInteractive`.
- Produces:
  - `selectPreviewLayerSpecs(state): PreviewLayerSpec[]` — Sources tab only; for each effectively visible node in `walkTree` order: `source` GeoJSON/FeatureCollection (not pending) → point/line/polygon; `source` MVT raster → raster; `source` MVT vector → nothing; `source-layer` → point/line/polygon with `sourceId = parentId`, `sourceLayer`; `folder` → nothing. Final array is **reversed** so the tree top is rendered last (on top). Layer ids unchanged.
  - `selectPreviewLayerIds(state): string[]` — `[]` unless Sources tab and `selectSelectedInteractive`; else the ids of specs whose node is in `collectSubtree(selectedNodeId)` (for a `source-layer` child: its 3 ids; for an MVT root: its visible children's ids).
  - `selectPreviewActive(state): boolean` — Sources tab and `selectPreviewLayerSpecs(state).length > 0`. Replaces `selectPreviewSourceId`, which is deleted.
- `map-body.tsx`: `selectLayers` hides user layers when `drawing || previewActive`; render `SourcePreviewLayer` when `!drawing && previewActive`.

- [ ] Update `selectors.test.ts`: two visible GeoJSON roots → 6 specs, the first root's specs at the end; hidden root → no specs; MVT root with children `roads` (visible) and `water` (hidden) → only `roads` specs with `sourceId` = root; parent hidden → no child specs; raster MBTiles → one raster spec; Layers tab → `[]`. `selectPreviewLayerIds`: selected `roads` → 3 `roads` ids even when another GeoJSON root is visible; selected MVT root → visible children's ids only; selected node hidden → `[]`. Replace `selectPreviewSourceId` tests with `selectPreviewActive`.
- [ ] Run; expect FAIL. Implement; run; expect PASS.
- [ ] Run `npm test -w @sphere/app`, `npm run typecheck`, `npm run format`.
- [ ] Commit: `git commit -m "Draw every visible source node in Sources preview"`

### Task 5: Feature selection rules for child nodes

**Files:**
- Create: `apps/sphere/src/store/listeners/clear-selection-on-node-change.ts`
- Test: `apps/sphere/src/store/listeners/clear-selection-on-node-change.test.ts`
- Modify: `apps/sphere/src/store/listeners/index.ts`, `apps/sphere/src/store/index.ts` (register middleware)
- Modify: `apps/sphere/src/store/listeners/rect-select.ts`, `rect-select-mvt.ts` (guard)
- Modify: `apps/sphere/src/sphere-hooks/useFeatureState.ts`
- Test: `rect-select.test.ts`, `useFeatureState.test.tsx`

**Interfaces:**
- Consumes: Task 3 `selectSelectedSourceRef`, `selectSelectedInteractive`.
- Produces: listener on `actions.source.select` and `actions.source.removeSource`: compare `selectSelectedSourceRef` of original vs new state by `sourceId` + `sourceLayer`; when different and `state.selection.count > 0`, dispatch `actions.selection.reset()` (the existing `clear-selection` listener performs the IPC).
- Rect-select drag/commit/click handlers in both listeners return early when `!selectSelectedInteractive(state)`.
- `useFeatureState` source-layer list: Layers-tab selection unchanged (`source.sourceLayers`); Sources-tab selection uses `[sourceLayer]` for a `source-layer` node and `source.sourceLayers` for an MVT root.

- [ ] Write `clear-selection-on-node-change.test.ts`: selecting `id/water` after `id/roads` with `count: 2` dispatches `selection/reset`; re-selecting the same node does not; changing with `count: 0` does not; GeoJSON root A → root B with count > 0 dispatches reset.
- [ ] Add to `rect-select.test.ts`: with selected node's parent hidden, `rectSelectCommit` and `rectSelectClick` call no selection IPC and dispatch nothing.
- [ ] Add to `useFeatureState.test.tsx`: selected `id/roads` → `setFeatureState` called only with `sourceLayer: "roads"`.
- [ ] Run; expect FAIL. Implement; run; expect PASS.
- [ ] Run `npm test -w @sphere/app`, `npm run typecheck`, `npm run format`.
- [ ] Commit: `git commit -m "Scope feature selection to the selected source node"`

### Task 6: Sources actions per node kind

**Files:**
- Modify: `apps/sphere/src/store/listeners/zoom-to.ts` (accept a node id; resolve with `resolveSourceRef`; folder → no-op)
- Modify: `apps/sphere/src/store/listeners/add-blank-layer.ts` (payload may be a node id; `source-layer` → `sourceId` = parent, `sourceLayer` = child; MVT root keeps the single-layer shortcut)
- Modify: `apps/sphere/src/store/listeners/auto-select-on-delete.ts` (source branch: next root sibling, else previous, using `rootIds` from original state)
- Modify: `apps/sphere/src/store/listeners/menu.ts` (`source.remove` no-ops for a child; `source.show-properties` no-ops unless resolved node is a `source`; `source.zoom-to` and `layer.add-blank` pass the node id)
- Modify: `apps/sphere/src/store/source/tree-selectors.ts` (add `selectSelectedNodeActions`)
- Modify: `apps/sphere/src/components/LeftSidebar/SourcesTab.tsx`, `apps/sphere/src/components/SourcePanel/index.tsx` (disable buttons from `selectSelectedNodeActions`)
- Test: `zoom-to.test.ts`, `add-blank-layer.test.ts`, `auto-select-on-delete.test.ts`, `menu.test.ts`, `tree-selectors.test.ts`, `SourcesTab.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `selectSelectedNodeActions(state): { canZoom: boolean; canRemove: boolean; canShowProperties: boolean; canAddLayer: boolean }` per the spec's action table (root `source`: all true except properties only for GeoJSON/FeatureCollection; child `source`: `canRemove` false; `source-layer`: zoom + add layer; `folder`: remove only).
- `zoomTo(id)` and `addBlankLayer(id)` payloads are node ids.

- [ ] Write tests: `selectSelectedNodeActions` table rows; `zoomTo("id/roads")` fits the parent's TileJSON bounds; `addBlankLayer("id/roads")` → `setSource({ sourceId: "id", sourceLayer: "roads" })`; MVT root with one layer still gets that layer; menu `source.remove` with a child selected dispatches nothing; removing the selected MBTiles root while `id/roads` is selected selects the next root (or previous, or nothing); `SourcesTab` trash button disabled when a child is selected.
- [ ] Run; expect FAIL. Implement; run; expect PASS.
- [ ] Run `npm test -w @sphere/app`, `npm run typecheck`, `npm run format`.
- [ ] Commit: `git commit -m "Apply source actions per tree node kind"`

### Task 7: Source panel for child and folder nodes

**Files:**
- Create: `apps/sphere/src/components/SourcePanel/SourceLayerPanel.tsx`, `FolderPanel.tsx`
- Modify: `apps/sphere/src/components/SourcePanel/index.tsx` (`PanelKind` gains `"source-layer"` and `"folder"`; `selectPanelKind` checks the selected node kind first)
- Modify: `apps/sphere/src/components/SourcePanel/VectorTilesSourcePanel.tsx` (extract the per-layer block into a component `VectorLayerSection({ layer }: { layer: VectorLayer })` reused by `SourceLayerPanel`)
- Test: `apps/sphere/src/components/SourcePanel/index.test.ts` (selector), `SourceLayerPanel.test.tsx`

**Interfaces:**
- Consumes: Task 3 `selectSelectedNode`, `selectCurrentSourceItem` (parent MVT for a child).
- `SourceLayerPanel` renders the parent TileJSON `vector_layers` entry whose `id` equals the node's `sourceLayer` (id, description, fields); if missing, "No metadata for this layer".
- `FolderPanel` renders name and `children.length`.

- [ ] Write tests: `selectPanelKind` → `"source-layer"` for a child, `"folder"` for a folder, unchanged for roots; `SourceLayerPanel` shows `roads` fields and not `water` fields.
- [ ] Run; expect FAIL. Implement; run; expect PASS. `npm run format`.
- [ ] Commit: `git commit -m "Show source panel for vector layer and folder nodes"`

### Task 8: `Tree` component in `@sphere/ui`

**Files:**
- Modify: `packages/ui/package.json` (peers: `react-arborist` `4.0.0`, `react-dnd` `^16.0.1`, `react-dnd-html5-backend` `^16.0.1`, `react-dnd-touch-backend` `16.0.1`)
- Modify: `apps/sphere/package.json` (deps: `react-arborist` `4.0.0`, `react-dnd-touch-backend` `16.0.1`); run `npm install`
- Create: `packages/ui/src/Tree/index.tsx`, `packages/ui/src/Tree/TreeRow.tsx`, `packages/ui/src/Tree/useElementSize.ts`, `packages/ui/src/Tree/move.ts`
- Test: `packages/ui/src/Tree/move.test.ts`, `packages/ui/src/Tree/index.test.tsx`
- Modify: `packages/ui/src/index.ts` (export `Tree`, types)

**Interfaces:**
- Produces:
  ```ts
  export type TreeItem = { id: string; label: string; icon?: ReactNode; extra?: ReactNode; children?: TreeItem[] }
  export type TreeMove = { ids: string[]; parentId?: string; index: number }
  export type TreeProps = {
      items: TreeItem[]
      selectedId?: string
      expandedIds: string[]
      onSelect: (id: string | undefined) => void
      onToggle: (id: string, expanded: boolean) => void
      onMove: (move: TreeMove) => void
      canDrop?: (move: TreeMove) => boolean
  }
  export function Tree(props: TreeProps): JSX.Element
  ```
  - `move.ts`: `toTreeMove(args: { dragIds: string[]; parentId: string | null; index: number }, siblings: string[]): TreeMove` — converts react-arborist's pre-removal index to a post-removal index (same rule as arborist's `adjustMoveIndex`: subtract the number of dragged siblings above `index`), `null` parent → `undefined`.
- Behaviour: react-arborist `Tree` with `data={items}`, `selection={selectedId}`, `initialOpenState` built from `expandedIds`, `onToggle` → `onToggle(id, node.isOpen)`, `disableMultiSelection` (multi-select UI is out of scope), `disableEdit`, `disableDrop` → `!canDrop(toTreeMove(...))`, `dndManager` from a module-level `createDragDropManager(TouchBackend, undefined, { enableMouseEvents: true })`, `width`/`height` from `useElementSize` on a wrapping `div` (`height: 100%`). Rows rendered by `TreeRow` reusing `OutlineItem` styles plus an expand chevron when `children?.length`. No Redux, no Tauri, no maplibre imports (biome enforces).

- [ ] Write `move.test.ts`: moving `a` from index 0 to slot 2 in `[a,b,c]` → `index: 1`; moving `c` to slot 0 → `index: 0`; root parent → `parentId: undefined`.
- [ ] Write `index.test.tsx` (happy-dom; mock `useElementSize` to return `{ width: 300, height: 400 }`): renders nested labels when expanded; clicking a row calls `onSelect("id")`; clicking the chevron calls `onToggle("id", true)`; `extra` content renders and its click does not call `onSelect`.
- [ ] Run `npm test -w @sphere/ui`; expect FAIL. Implement; run; expect PASS. If react-arborist 4 (ESM-only) fails under Vitest, switch both packages to `react-arborist@3.16.0` and note it in the commit.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run format`.
- [ ] Commit: `git commit -m "Add Tree component to sphere ui"`

### Task 9: Sources outline on the tree

**Files:**
- Modify: `apps/sphere/src/components/SourcesOutline/index.tsx`
- Create: `apps/sphere/src/store/source/outline-selectors.ts`
- Test: `apps/sphere/src/store/source/outline-selectors.test.ts`, `apps/sphere/src/components/SourcesOutline/index.test.tsx`

**Interfaces:**
- Consumes: Task 2 actions (`select`, `setVisible`, `setExpanded`, `move`), Task 1 `canMove`, Task 8 `Tree`.
- Produces: `selectSourceOutline(state): OutlineNode[]` where `OutlineNode = { id: Id; label: string; kind: SourceNodeKind; sourceType?: SourceType; visible: boolean; children: OutlineNode[] }`, built from `rootIds`/`nodes` in tree order. Component maps it to `TreeItem` adding the icon (`IconBraces` for sources as today, `IconStack` for `source-layer`, `IconFolder` for folders) and a bulb `ActionIcon` (`IconBulb`/`IconBulbOff`, same as `LayersOutline`) that dispatches `setVisible({ id, value: !visible })`.
- `canDrop` calls `canMove(nodes, move.ids, move.parentId, move.index)` via a selector-provided function, never inline tree logic.

- [ ] Write `outline-selectors.test.ts`: MBTiles root with two children → nested structure in order, `visible` flags copied.
- [ ] Write `SourcesOutline/index.test.tsx` (mock `@sphere/ui` `Tree` to render items and expose callbacks): bulb click dispatches `source/setVisible`; `onMove` dispatches `source/move`; `onSelect` dispatches `source/select`.
- [ ] Run; expect FAIL. Implement; run; expect PASS.
- [ ] Run the app (`npm run tauri dev`), open an MBTiles with several vector layers and a GeoJSON; check: tree shows children, bulbs hide/show on map, both sources draw together, drag reorders roots and changes draw order, children cannot be dragged out, dropping a file from Finder still opens it, Layers tab unaffected by Sources bulbs.
- [ ] Run `npm run format`. Commit: `git commit -m "Render Sources outline as a tree"`

### Task 10: Docs and final verification

**Files:**
- Modify: `AGENTS.md` (`source` slice description: tree fields, `selectedIds`, node kinds, resolver selector; `SourcePreviewLayer` / `map-body` description: preview of all visible nodes, hover limited to selected subtree; `@sphere/ui` Tree with touch backend and why)
- Move: `docs/plans/20261024-source-tree.md` → `docs/plans/completed/20261024-source-tree.md`

- [ ] Update AGENTS.md sections listed above (no stale `selectedId`/`selectPreviewSourceId` mentions: `rg -n "selectedId|selectPreviewSourceId|previewSourceId" AGENTS.md`).
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`; expect all clean/PASS.
- [ ] Run `npm run format`; move the plan to `docs/plans/completed/`.
- [ ] Commit: `git commit -m "Document source tree"`
