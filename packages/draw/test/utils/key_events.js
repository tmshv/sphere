const KEY_ENTER = 13
const KEY_ESCAPE = 27
const KEY_BACKSPACE = 8
const KEY_1 = 49
const KEY_2 = 50
const KEY_3 = 51

// Draw only handles key events whose source element is the map canvas.
const mapCanvas = { classList: { contains: cls => cls === "maplibregl-canvas" } }

function makeKeyEvent(type, keyCode) {
    const event = new KeyboardEvent(type)
    Object.defineProperty(event, "keyCode", { value: keyCode })
    Object.defineProperty(event, "srcElement", { value: mapCanvas })
    return event
}

export const enterEvent = () => makeKeyEvent("keyup", KEY_ENTER)
export const startPointEvent = () => makeKeyEvent("keydown", KEY_1)
export const startLineStringEvent = () => makeKeyEvent("keydown", KEY_2)
export const startPolygonEvent = () => makeKeyEvent("keydown", KEY_3)
export const escapeEvent = () => makeKeyEvent("keyup", KEY_ESCAPE)
export const backspaceEvent = () => makeKeyEvent("keydown", KEY_BACKSPACE)
