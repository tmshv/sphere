const KEY_ENTER = 13
const KEY_ESCAPE = 27
const KEY_BACKSPACE = 8
const KEY_1 = 49
const KEY_2 = 50
const KEY_3 = 51

const MAP_CANVAS_CLASS = "maplibregl-canvas"

// Draw only handles key events whose source element is the map canvas.
const mapCanvas = { classList: { contains: (cls: string) => cls === MAP_CANVAS_CLASS } }

/**
 * A DOM keyboard event with a `keyCode` and the map canvas as its source
 * element. Dispatch it on the map container; it also satisfies Draw's
 * `DrawKeyboardEvent`.
 */
function makeKeyEvent(type: "keydown" | "keyup", keyCode: number): KeyboardEvent {
    const event = new KeyboardEvent(type)
    Object.defineProperty(event, "keyCode", { value: keyCode })
    Object.defineProperty(event, "srcElement", { value: mapCanvas })
    return event
}

export const enterEvent = (): KeyboardEvent => makeKeyEvent("keyup", KEY_ENTER)
export const startPointEvent = (): KeyboardEvent => makeKeyEvent("keydown", KEY_1)
export const startLineStringEvent = (): KeyboardEvent => makeKeyEvent("keydown", KEY_2)
export const startPolygonEvent = (): KeyboardEvent => makeKeyEvent("keydown", KEY_3)
export const escapeEvent = (): KeyboardEvent => makeKeyEvent("keyup", KEY_ESCAPE)
export const backspaceEvent = (): KeyboardEvent => makeKeyEvent("keydown", KEY_BACKSPACE)
