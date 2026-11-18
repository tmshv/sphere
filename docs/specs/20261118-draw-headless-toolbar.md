# Draw: headless control, tools in the app toolbar

## Intent

`@sphere/draw` is vendored upstream code and still reads like it: snake_case file names, upstream docs, and its own map buttons in the upstream look. Draw mode should feel like part of Sphere. The drawing tools belong in Sphere's own toolbar, built from `@sphere/ui`, next to Cancel and Done. The package stays a self-contained part of the repo that knows nothing about the app.

## Goals

- Every file in `packages/draw` uses kebab-case names, like the rest of the repo.
- The package carries no docs or examples.
- The package can run headless: an option turns off its map buttons. The buttons stay available for any other consumer, and are on by default.
- The app runs draw headless and shows every draw tool in one toolbar at the bottom of the map, together with Cancel and Done, built from `@sphere/ui` and `@sphere/icons`.

## Non-goals

- New drawing tools or modes.
- Changing draw's behaviour, selection rules, keyboard shortcuts or look (`spherePreset` stays as it is).
- Splitting the package into a separate headless core and button control (considered, see Approaches).

## Anti-goals

- Losing a tool or a shortcut that works today: point, line, polygon, delete, combine, uncombine, and the keys `1`/`2`/`3` and Delete/Backspace on the map.
- The package importing anything from the app, Redux, Tauri, `@sphere/ui` or `@sphere/icons`.
- A toolbar button that does nothing when pressed: actions that need a selection are disabled without one.

## Approaches

1. **An option on the existing control (chosen).** Draw stays a MapLibre `IControl` mounted by react-map-gl's `useControl`. A new option hides the buttons: no button container, no buttons. Everything else (layers, events, modes, keys) is unchanged. Smallest change; the app's mounting code stays.
2. **Headless core plus a separate button control.** The core attaches with something like `draw.addTo(map)` and contains no UI code; the buttons become an optional control that follows the core's mode events. Cleaner separation, but the button highlight is driven from inside the modes today, so it is a larger refactor, and the app would mount draw without `useControl`. No visible difference in the app. Rejected for now.

## Design

### Package (`@sphere/draw`)

- **File names.** Every snake_case file and directory is renamed to kebab-case (`direct_select.ts` → `direct-select.ts`, `feature_types/` → `feature-types/`, `test-utils/after_next_render.ts` → `after-next-render.ts`, …). Imports follow. Runtime strings do not change: mode names (`simple_select`, `direct_select`, `draw_point`, `draw_line_string`, `draw_polygon`, `static`), `controls` keys (`line_string`, `combine_features`, …), CSS class names and event names stay as they are, because the app and the stylesheet use them.
- **Docs.** `README.md`, `docs/API.md`, `docs/EXAMPLES.md` and `docs/MODES.md` are deleted, and so is the unused `svg/` folder (the stylesheet embeds its own icons). `LICENSE` stays: it is the upstream ISC licence of the vendored code, and keeping its notice is the licence's condition.
- **Headless option.** A new option `buttons: boolean`, default `true`. With `buttons: false` the control renders no button group: `onAdd` returns an empty element that holds nothing and takes no space, and no button is ever created. `controls` keeps its meaning, which tools are enabled, and keeps gating the keyboard shortcuts as today, so a headless control with `controls.trash` still deletes on Delete.

### App

- **Toolbar.** The bar at the bottom of the map (the `Overlay` bottom slot in `Draw.tsx`) holds, left to right:
  - the three drawing tools, Point, Line and Polygon, as one group where the active one is shown pressed;
  - Delete;
  - Combine and Uncombine;
  - Cancel and Done, at the right end, as today.
- **Tool state.** The pressed tool follows the draw mode already in Redux (`draw.mode`, from `modeChanged`): Point in `draw_point`, Line in `draw_line_string`, Polygon in `draw_polygon`, none otherwise.
- **Mode after a toolbar action.** Draw's public `changeMode` is silent (no `draw.modechange`), so a mode the app starts would never reach Redux. After every toolbar action the listener reads `draw.getMode()` and dispatches `modeChanged` with it. Mode changes draw makes on its own (finishing a feature, a trash while drawing) already fire `draw.modechange`.
- **Pressing a tool** starts that drawing mode. Pressing the pressed tool cancels the feature being drawn and returns to selecting, as draw's own buttons do (they call `trash`).
- **Delete, Combine, Uncombine** call the matching draw action. Each is enabled exactly when draw reports it actionable through its existing `draw.actionable` event (`{ trash, combineFeatures, uncombineFeatures }`), kept in Redux. That is draw's own rule: Delete with a selected feature, with selected vertices in `direct_select`, and while drawing (it cancels the feature); Combine with two or more selected features of the same type; Uncombine with a selected multi-part feature.
- **Actionable state is correct in the package.** `simple_select` today reports all three actionable when it starts, overriding what it just computed from the selection; that is fixed so the event always matches the selection. A silent selection change (`setSelected`, `load`/`unload`) also updates it, since the app pushes the backend selection into draw that way. The state at session start reaches Redux, so the bar is right before the first change.
- **Blocking.** While a load or a session end runs (`loading || pending`), the tools are disabled like Done. Cancel keeps its current rule.
- **Logic outside components.** Toolbar buttons only dispatch actions. A listener calls the draw control. The control is reached through a registry like the op queue's (`registerDrawQueue`), not through component props. An action that arrives with no control registered (the session just ended) does nothing.
- **Icons.** Point, Line, Polygon and Trash exist in `@sphere/icons`. Icons for Combine and Uncombine are added to `packages/icons/src/tabler.ts`.
- **Titles.** Each tool's title names its shortcut, as draw's own buttons did: "Point (1)", "Line (2)", "Polygon (3)".
- **Draw control options.** The app passes `buttons: false` and keeps its `controls` list, so every shortcut keeps working.
- **CSS.** The app keeps importing `@sphere/draw/maplibre-gl-draw.css`: besides the buttons it styles draw's cursors on the map.

## Calls (mine, please correct)

- The option is named `buttons`, not `controls: false`: `controls` already decides which tools exist and which shortcuts work, so turning it off would also kill the keys.
- Pressing the active tool again cancels the drawing, matching upstream's buttons.
- Delete, Combine and Uncombine are disabled, not hidden, when they would do nothing: the bar keeps its shape.
- Their enabled state is draw's `draw.actionable`, not a rule of the app's own, so the bar and the Delete key never disagree.
- The mode is read back with `getMode()` after a toolbar action, instead of making the public `changeMode` fire `draw.modechange`: the package API keeps upstream's rule that API calls are silent.
- Fixing `simple_select`'s start-up actionable state, and updating it on silent selection changes, is in scope despite "no behaviour change": it changes only what the event reports, to match what the actions already do.

## Left to the builder

- Which `@sphere/ui` components make the bar (an icon-only `SegmentedControl` for the tools, glyph buttons, separators), within the design system rules in `docs/specs/20261112-desktop-design-system.md`.
- Which Tabler icons stand for Combine and Uncombine.
- The action and listener names.

## Constraints

- AGENTS.md: tests before changes, logic in listeners and not components, no lint suppressions, no `as` casts outside `src/test-utils/` in the package.
- Package boundaries stay as documented: `@sphere/draw` imports nothing from the app or the other workspace packages.
- AGENTS.md is updated where it names draw files, options or the toolbar.
