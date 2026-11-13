# Modes

A mode decides what clicks, drags, taps and keys do, and how features are drawn. Draw is in exactly one mode at a time. The built-in modes are `simple_select`, `direct_select`, `draw_point`, `draw_line_string` and `draw_polygon` (`MapLibreDraw.modes`). `draw.changeMode(name, options)` switches between them.

## Writing a mode

A mode is a subclass of `Mode` (`src/modes/mode.ts`). Draw constructs it when it switches to the mode and drops it when it leaves, so one instance is one activation of the mode:

- The **constructor** sets the mode up: adds or selects features, sets UI classes and the active button, and keeps the mode's state in fields. It receives the options passed to `changeMode` (`ChangeModeOptions`).
- **Event hooks** are optional methods. Draw only listens to the events whose hook the mode defines. A hook that returns something truthy skips the re-render after the event.
- **`toDisplayFeatures`** is required. Draw calls it for every feature it renders; the mode pushes what to draw.

```ts
import MapLibreDraw, { Mode } from "@sphere/draw"
import type { ChangeModeOptions, DrawKeyboardEvent, DrawMouseEvent, DrawRenderFeature, ModeContext } from "@sphere/draw"

const ESCAPE_KEY_CODE = 27

/** Adds a point on every click until Escape. */
class LotsOfPoints extends Mode {
    #count: number

    constructor(ctx: ModeContext, options: ChangeModeOptions) {
        super(ctx)
        this.#count = typeof options.count === "number" ? options.count : 0
        this.updateUIClasses({ mouse: "add" })
    }

    onClick(e: DrawMouseEvent) {
        const point = this.newFeature({
            type: "Feature",
            properties: { count: this.#count++ },
            geometry: { type: "Point", coordinates: [e.lngLat.lng, e.lngLat.lat] },
        })
        this.addFeature(point)
    }

    onKeyUp(e: DrawKeyboardEvent) {
        if (e.keyCode === ESCAPE_KEY_CODE) this.changeMode("simple_select")
    }

    toDisplayFeatures(geojson: DrawRenderFeature, display: (geojson: DrawRenderFeature) => void) {
        display(geojson)
    }
}

const draw = new MapLibreDraw({
    modes: { ...MapLibreDraw.modes, lots_of_points: LotsOfPoints },
})
draw.changeMode("lots_of_points", { count: 10 })
```

Passing `modes` replaces the built-in modes, so spread `MapLibreDraw.modes` to keep them.

## Hooks

| Hook                        | Called when                                   |
| --------------------------- | --------------------------------------------- |
| `onClick(e)`                | the map is clicked                            |
| `onMouseDown(e)`            | a mouse button goes down on the map           |
| `onMouseUp(e)`              | a mouse button goes up on the map             |
| `onMouseMove(e)`            | the mouse moves with no button down           |
| `onDrag(e)`                 | the mouse or a finger moves while down        |
| `onMouseOut(e)`             | the mouse leaves the map container            |
| `onTap(e)`                  | the map is tapped                             |
| `onTouchStart(e)`           | a touch starts on the map                     |
| `onTouchMove(e)`            | a touch moves                                 |
| `onTouchEnd(e)`             | a touch ends                                  |
| `onKeyDown(e)`              | a key goes down while the map has focus       |
| `onKeyUp(e)`                | a key goes up while the map has focus         |
| `onStop()`                  | Draw leaves the mode                          |
| `onTrash()`                 | `draw.trash()` is called                      |
| `onCombineFeatures()`       | `draw.combineFeatures()` is called            |
| `onUncombineFeatures()`     | `draw.uncombineFeatures()` is called          |
| `toDisplayFeatures(g, add)` | Draw renders a feature (required)             |

Mouse and touch events carry `point` (screen pixels), `lngLat` and the original DOM event. Events on a Draw feature also carry `featureTarget`, the rendered feature under the pointer.

`toDisplayFeatures` gets each feature as GeoJSON with Draw's render properties (`id`, `meta`, `active`, `mode`, …; see "Styling Draw" in [API.md](API.md)). Push it unchanged, push it with changed properties, push extra features such as vertices and midpoints, or push nothing to hide it.

## The mode API

`Mode` gives subclasses the methods the built-in modes use. Each is documented in `src/modes/mode.ts`.

- Features: `newFeature`, `addFeature`, `getFeature`, `deleteFeature`, `isInstanceOf`, `doRender`, `featuresAt`
- Selection: `select`, `deselect`, `setSelected`, `getSelected`, `getSelectedIds`, `isSelected`, `clearSelectedFeatures`, `setSelectedCoordinates`, `clearSelectedCoordinates`
- Draw and UI: `changeMode`, `setActionableState`, `updateUIClasses`, `activateUIButton`
- Fields: `map` (the MapLibre map), `drawConfig` (Draw's options), `ctx`
