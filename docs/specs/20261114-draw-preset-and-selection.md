# Draw: Sphere style preset and backend-owned multi-select

## Intent

Draw mode should feel like the rest of Sphere. Two things break that today.

1. **Look.** `@sphere/draw` draws with the upstream MapLibre Draw theme: blue features, orange selection. The rest of the drawn source is shown by `DrawContextLayer` in the app's preview look: black, white outline, red selection. As the working set loads and unloads while panning, features visibly switch between the two looks. They should be indistinguishable.
2. **Selection.** Draw keeps its own selection, with its own click rules and its own shift box-select. The app's selection lives in Rust: rect queries run on the backend, and the frontend only receives a delta of ids to highlight and clear. Draw mode should use that same selection and the same gestures.

## Goals

- `@sphere/draw` ships style presets. The current theme stays as the `classic` preset. A new `sphere` preset matches the app's preview layers: the same colours, widths, radii and outline, with the selection in the highlight colour.
- The app draws with the `sphere` preset, so a feature looks the same in draw as in `DrawContextLayer`, before and after it loads.
- In draw mode, the Rust selection is the only selection. Draw's selection mirrors it.
- Clicks and rectangles in draw mode follow the app's rules.

## Non-goals

- Changing the app's preview look or selection colour.
- Multi-select for MVT sources (draw only edits in-memory sources).
- Vertex editing of more than one feature at a time.

## Anti-goals

- Any visible change in a feature's look when it moves between `DrawContextLayer` and draw. Only selection may change the look.
- Draw and the Rust selection disagreeing at any moment the user can act on.
- A load or unload of the working set that changes the selection.

## Approaches

Selection, two ways to make Rust the single owner:

1. **Draw selects at once, and the app mirrors to Rust (chosen).** Draw's clicks select locally and immediately; the app forwards each `draw.selectionchange` to Rust. Rect selection runs in Rust as it does outside draw; its delta is applied to draw silently. Moving a feature takes a click to select it, then a drag, as upstream draw always did (`simple_select` drag-moves only selected features); press-and-drag on an unselected feature does not move it.
2. **Draw never selects by itself.** Every click asks Rust first, and draw only applies what comes back. This is purer, but every click waits for an IPC round trip before draw shows the selection, and draw's own select-then-edit flow (a click on the only selected feature enters `direct_select`) would wait on it too. Rejected.

Style: presets live in the package (asked for), parameterised by the app's constants, rather than the app passing raw `styles` arrays.

## Design

### Package: presets (`@sphere/draw`)

- `classicPreset`: the current `lib/theme.ts`, unchanged. It stays the default when no `styles` option is given.
- `spherePreset(options): DrawStyleLayer[]`, with options `color`, `highlightColor`, `outline: boolean` and `pointRadius`. It mirrors the app's geometry layers:
  - **Polygon.** Fill in `color` at opacity 0.15. A white inner line, width 1 and offset -1, drawn only when `outline` is set. An edge line in `color`, width 1.
  - **Line.** A white casing, width 3, drawn only when `outline` is set, under a line in `color`, width 1.
  - **Point.** A circle of radius `pointRadius` in `color`, with a white stroke of width 1 when `outline` is set.
  - **Active** (selected, `active=true`): the same layers in `highlightColor`. Lines and polygon edges keep the dashed pattern.
  - **Vertices and midpoints.** A white ring with a `highlightColor` centre, like `classic` but in the highlight colour.
- Both presets are exported from the package barrel.

### Package: selection

- Click rules in `simple_select` change to the app's:
  - a click on a feature replaces the selection;
  - shift-click adds;
  - cmd/ctrl-click removes;
  - a click on empty map clears it.
  
  A click on the only selected feature still enters `direct_select`. Moving, deleting and combining work on any selection.
- `boxSelect: false` turns off draw's own shift-drag box. The app sets it.
- New API `setSelected(ids)`. It replaces draw's selection silently, with no `draw.selectionchange`. Ids not loaded in draw are ignored. If draw is in `direct_select` and the selection is no longer exactly that one feature, it returns to `simple_select`.
- `load` and `unload` never emit `draw.selectionchange`. Unloading a selected feature drops it from draw's selection only, silently.

### App

- **Preset.** `Draw.tsx` builds the control with `spherePreset({ color: PREVIEW_COLOR, highlightColor: FEATURE_HIGHLIGHT_COLOR, outline, pointRadius: PREVIEW_RADIUS })` and `boxSelect: false`. `outline` is the `previewOutline` setting read when the session starts; a toggle during a session applies to the next one.
- **Clicks: draw to Rust.** Each `draw.selectionchange` becomes `selection_set(backendIds)`. The resulting delta goes on the selection bus, so feature-state, the count and the attribute table all update as they do outside draw.
  - A created feature has only a draw id until its `create` op settles. Its selection is mirrored once the backend id is known, in the same order as the ops.
- **Rectangles: Rust to draw.** In draw mode, with the Select tool, a drag on empty map runs the existing rect-select flow on the drawn source: `selection_rect`, then the delta on the bus. A drag that starts on a draw feature belongs to draw and draws no rectangle: draw moves the feature if it is selected (an unselected one must be clicked first). While draw creates a feature (`draw_point`, `draw_line_string`, `draw_polygon`), every press belongs to draw. With the Navigation tool, a drag pans.
- **Bus to draw.** While drawing, every selection delta is applied to draw: `setSelected` with the selected ids that are loaded.
- **Selection loads into draw.** The working set becomes the union of three parts:
  - the viewport features, when they fit the cap;
  - the selected features, when they fit the cap;
  - the pinned edited features.

  A selection change re-runs the loader. Selected features that aren't loaded get loaded, up to the cap, so rect-selecting a region while zoomed out past the cap loads just that region. Over the cap, the selection still shows red through `DrawContextLayer` but can't be edited, and the existing notice appears.
- **Starting a session.** A selection on the drawn source becomes draw's selection and joins the working set. This replaces today's "selection scope only" rule. A selection on another source is left alone until the first selection change in draw replaces it.
- **Edits.** Deleting selected features removes them from the Rust selection.

## Calls (mine, please correct)

- The new click rules replace upstream's shift-toggle in the package outright. The app is its only consumer.
- `previewOutline` is read once per session.
- Clicks on `DrawContextLayer` features, which happens only over the cap, do nothing.
- A delete removes the ids from the Rust selection. The alternative is to rely on `selection_get_ids` filtering out missing ids, if it already does.
- **Tools in draw mode.** The statusbar map tool (`app.mapTool`) applies during draw as it does outside it; `tools.activeTool === "draw"` does not change it.
  - **Navigation:** a drag on empty map pans.
  - **Select and Info:** a drag on empty map draws the rectangle.
  - **Clicks select in draw under every tool.** Draw is an editor.
- **Which source the selection belongs to.** While drawing, it always belongs to the drawn source (`draw.sourceId`), whatever node is selected in the tree. The selection target, rect-select and the highlight on `DrawContextLayer` all resolve to it. If the tree selection changes mid-session, the existing listener clears the selection as it does today. Draw follows that clear like any other delta.
- **Vertices stay in draw.** Only feature selection is mirrored to Rust; selected vertices in `direct_select` are not. The new click rules apply in `simple_select` only, and `direct_select` keeps its own vertex rules.
- **Created features.**
  - **Selecting.** A just-created feature is selected in draw at once. The mirror sends `selection_set` only after the op queue has settled every queued op, so Rust always gets backend ids.
  - **Rectangles.** A rect query in draw mode also waits for the queue first, so a rectangle can catch features created a moment ago.
- **Rectangle deltas are the same as outside draw.** A live preview runs while dragging (shift adds) and is applied on release. Draw follows every delta, the preview ones included, so the drag highlights loaded features live, exactly as feature-state does on the rest.
- **Rectangles see unsaved edits.** `selection_rect` queries the store that holds the in-place edits, so a rectangle sees the edited geometry. This is intended.
- **Ids that stop existing.** After a commit or rollback, the selection drops ids that no longer exist: features created and then rolled back, and deleted ones. If `selection_get_ids` does not already filter them, the backend does it at commit or rollback.

## Left to the builder

- Exact layer ids and filter expressions of `spherePreset`. They must keep draw's `active`/`meta`/`mode` property contract.
- How the bus fans out to both `useFeatureState` and draw (the bus holds one listener per kind today).
- How `RectSelectOverlay` decides a mousedown belongs to draw.
- Whether `rect-select`'s gating (`selectSelectedInteractive`, preview layer ids) needs a draw-mode branch.

## Constraints

- AGENTS.md: tests before changes, logic in listeners and not components, no lint suppressions. Bump `crates/*` minor once per PR if any crate changes.
- `@sphere/draw` stays free of Tauri, Redux and app constants. Presets take their values as arguments.
