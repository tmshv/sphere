import type { Map as MapLibreMap } from "maplibre-gl"
import setupModeHandler, { type ModeHandle, type RenderPush } from "./lib/mode_handler"
import getFeaturesAndSetCursor from "./lib/get_features_and_set_cursor"
import featuresAt from "./lib/features_at"
import isClick, { type PointerStamp } from "./lib/is_click"
import isTap from "./lib/is_tap"
import * as Constants from "./constants"
import { fireDrawEvent } from "./map-events"
import modeBuilder, { type ModeBuilder } from "./modes/mode_builder"
import type { DrawContext } from "./context"
import type {
    ChangeModeEventOptions,
    ChangeModeOptions,
    DrawActionableState,
    DrawKeyboardEvent,
    DrawMouseEvent,
    DrawPointerEvent,
    DrawRenderFeature,
    DrawTouchEvent,
} from "./types"

const KEY_CODE_BACKSPACE = 8
const KEY_CODE_DELETE = 46
const KEY_CODE_DIGIT_0 = 48
const KEY_CODE_DIGIT_9 = 57
const PRIMARY_BUTTON_PRESSED = 1
const MAP_CANVAS_CLASS = "maplibregl-canvas"

/** Whether the key is the one that starts the tool. A digit key's key code is the digit's character code. */
function isToolKey(event: { keyCode: number }, tool: keyof typeof Constants.toolKeys): boolean {
    return event.keyCode === Constants.toolKeys[tool].charCodeAt(0)
}

/** A MapLibre `data` event; Draw re-adds its layers when the style is replaced. */
export interface DataEvent {
    dataType: string
}

/** An element that can tell its classes, as the target of a keyboard event on the map. */
interface ClassListHolder {
    classList: { contains(token: string): boolean }
}

function hasClassList(value: unknown): value is ClassListHolder {
    return (
        typeof value === "object" &&
        value !== null &&
        "classList" in value &&
        typeof value.classList === "object" &&
        value.classList !== null &&
        "contains" in value.classList &&
        typeof value.classList.contains === "function"
    )
}

/** Events that can be fed to Draw by name, as if the map or its container fired them. */
export interface FireEvents {
    mousedrag: DrawMouseEvent
    touchdrag: DrawTouchEvent
    mousemove: DrawMouseEvent
    mousedown: DrawMouseEvent
    mouseup: DrawMouseEvent
    mouseout: MouseEvent
    touchstart: DrawTouchEvent
    touchmove: DrawTouchEvent
    touchend: DrawTouchEvent
    keydown: DrawKeyboardEvent
    keyup: DrawKeyboardEvent
    data: DataEvent
}

type FireHandlers = { [K in keyof FireEvents]: (event: FireEvents[K]) => void }

export interface DrawEvents {
    start(): void
    changeMode(modename: string, nextModeOptions?: ChangeModeOptions, eventOptions?: ChangeModeEventOptions): void
    actionable(actions: DrawActionableState): void
    currentModeName(): string | null
    currentModeRender(geojson: DrawRenderFeature, push: RenderPush): void
    fire<K extends keyof FireEvents>(name: K, event: FireEvents[K]): void
    addEventListeners(): void
    removeEventListeners(): void
    trash(): void
    combineFeatures(): void
    uncombineFeatures(): void
    getMode(): string | null
}

export default function events(ctx: DrawContext): DrawEvents {
    const modes: Record<string, ModeBuilder> = {}
    for (const k of Object.keys(ctx.options.modes)) {
        modes[k] = modeBuilder(ctx.options.modes[k])
    }

    let mouseDownInfo: Partial<PointerStamp> = {}
    let touchStartInfo: Partial<PointerStamp> = {}
    let currentModeName: string | null = null
    let currentMode: ModeHandle | null = null

    function mode(): ModeHandle {
        if (currentMode === null) throw new TypeError("Draw has not started a mode")
        return currentMode
    }

    function drag(event: DrawPointerEvent, isDrag: (endInfo: PointerStamp) => boolean) {
        if (
            isDrag({
                point: event.point,
                time: Date.now(),
            })
        ) {
            ctx.ui.queueMapClasses({ mouse: Constants.cursors.DRAG })
            mode().drag(event)
        } else {
            event.originalEvent.stopPropagation()
        }
    }

    function mousedrag(event: DrawMouseEvent) {
        drag(event, endInfo => !isClick(mouseDownInfo, endInfo))
    }

    function touchdrag(event: DrawTouchEvent) {
        drag(event, endInfo => !isTap(touchStartInfo, endInfo))
    }

    function mousemove(event: DrawMouseEvent) {
        const button =
            event.originalEvent.buttons !== undefined ? event.originalEvent.buttons : event.originalEvent.which
        if (button === PRIMARY_BUTTON_PRESSED) {
            return mousedrag(event)
        }
        const target = getFeaturesAndSetCursor(event, ctx)
        mode().mousemove(Object.assign(event, { featureTarget: target }))
    }

    function mousedown(event: DrawMouseEvent) {
        mouseDownInfo = {
            time: Date.now(),
            point: event.point,
        }
        const target = getFeaturesAndSetCursor(event, ctx)
        mode().mousedown(Object.assign(event, { featureTarget: target }))
    }

    function mouseup(event: DrawMouseEvent) {
        const target = getFeaturesAndSetCursor(event, ctx)
        const targeted = Object.assign(event, { featureTarget: target })

        if (
            isClick(mouseDownInfo, {
                point: event.point,
                time: Date.now(),
            })
        ) {
            mode().click(targeted)
        } else {
            mode().mouseup(targeted)
        }
    }

    function mouseout(event: MouseEvent) {
        mode().mouseout(event)
    }

    function touchstart(event: DrawTouchEvent) {
        // Prevent emulated mouse events because we will fully handle the touch here.
        // This does not stop the touch events from propagating to the map though.
        event.originalEvent.preventDefault()
        if (!ctx.options.touchEnabled) {
            return
        }

        touchStartInfo = {
            time: Date.now(),
            point: event.point,
        }
        const target = featuresAt.touch(event, null, ctx).at(0)
        mode().touchstart(Object.assign(event, { featureTarget: target }))
    }

    function touchmove(event: DrawTouchEvent) {
        event.originalEvent.preventDefault()
        if (!ctx.options.touchEnabled) {
            return
        }

        mode().touchmove(event)
        return touchdrag(event)
    }

    function touchend(event: DrawTouchEvent) {
        event.originalEvent.preventDefault()
        if (!ctx.options.touchEnabled) {
            return
        }

        const target = featuresAt.touch(event, null, ctx).at(0)
        const targeted = Object.assign(event, { featureTarget: target })
        if (
            isTap(touchStartInfo, {
                time: Date.now(),
                point: event.point,
            })
        ) {
            mode().tap(targeted)
        } else {
            mode().touchend(targeted)
        }
    }

    // Backspace and Delete trash; digits switch modes
    const isKeyModeValid = (code: number) =>
        !(
            code === KEY_CODE_BACKSPACE ||
            code === KEY_CODE_DELETE ||
            (code >= KEY_CODE_DIGIT_0 && code <= KEY_CODE_DIGIT_9)
        )

    function keydown(event: DrawKeyboardEvent) {
        const element = event.srcElement || event.target
        if (!hasClassList(element)) throw new TypeError("Keyboard event has no target element")
        const isMapElement = element.classList.contains(MAP_CANVAS_CLASS)
        if (!isMapElement) return // we only handle events on the map

        if ((event.keyCode === KEY_CODE_BACKSPACE || event.keyCode === KEY_CODE_DELETE) && ctx.options.controls.trash) {
            event.preventDefault()
            mode().trash()
        } else if (isKeyModeValid(event.keyCode)) {
            mode().keydown(event)
        } else if (isToolKey(event, Constants.types.POINT) && ctx.options.controls.point) {
            changeMode(Constants.modes.DRAW_POINT)
        } else if (isToolKey(event, Constants.types.LINE) && ctx.options.controls.line_string) {
            changeMode(Constants.modes.DRAW_LINE_STRING)
        } else if (isToolKey(event, Constants.types.POLYGON) && ctx.options.controls.polygon) {
            changeMode(Constants.modes.DRAW_POLYGON)
        }
    }

    function keyup(event: DrawKeyboardEvent) {
        if (isKeyModeValid(event.keyCode)) {
            mode().keyup(event)
        }
    }

    function data(event: DataEvent) {
        if (event.dataType === "style") {
            const { setup, map, options, store } = ctx
            const hasLayers = options.styles.some(style => map.getLayer(style.id))
            if (!hasLayers) {
                setup.addLayers()
                store.setDirty()
                store.render()
            }
        }
    }

    const handlers: FireHandlers = {
        mousedrag,
        touchdrag,
        mousemove,
        mousedown,
        mouseup,
        mouseout,
        touchstart,
        touchmove,
        touchend,
        keydown,
        keyup,
        data,
    }

    function changeMode(
        modename: string,
        nextModeOptions?: ChangeModeOptions,
        eventOptions: ChangeModeEventOptions = {},
    ) {
        mode().stop()

        const modebuilder = modes[modename]
        if (modebuilder === undefined) {
            throw new Error(`${modename} is not valid`)
        }
        currentModeName = modename
        const nextMode = modebuilder(ctx, nextModeOptions)
        currentMode = setupModeHandler(nextMode, ctx)

        if (!eventOptions.silent) {
            fireDrawEvent(ctx.map, Constants.events.MODE_CHANGE, { mode: modename })
        }

        ctx.store.setDirty()
        ctx.store.render()
    }

    const actionState: DrawActionableState = {
        trash: false,
        combineFeatures: false,
        uncombineFeatures: false,
    }

    function actionable(actions: DrawActionableState) {
        let changed = false
        for (const action of Object.keys(actions)) {
            if (!isAction(action)) throw new Error("Invalid action type")
            if (actionState[action] !== actions[action]) changed = true
            actionState[action] = actions[action]
        }
        if (changed) fireDrawEvent(ctx.map, Constants.events.ACTIONABLE, { actions: actionState })
    }

    function isAction(action: string): action is keyof DrawActionableState {
        return action in actionState
    }

    function on(map: MapLibreMap) {
        map.on("mousemove", mousemove)
        map.on("mousedown", mousedown)
        map.on("mouseup", mouseup)
        map.on("data", data)

        map.on("touchmove", touchmove)
        map.on("touchstart", touchstart)
        map.on("touchend", touchend)
    }

    function off(map: MapLibreMap) {
        map.off("mousemove", mousemove)
        map.off("mousedown", mousedown)
        map.off("mouseup", mouseup)
        map.off("data", data)

        map.off("touchmove", touchmove)
        map.off("touchstart", touchstart)
        map.off("touchend", touchend)
    }

    const api: DrawEvents = {
        start() {
            currentModeName = ctx.options.defaultMode
            const builder = modes[currentModeName]
            if (builder === undefined) throw new TypeError(`${currentModeName} is not valid`)
            currentMode = setupModeHandler(builder(ctx), ctx)
        },
        changeMode,
        actionable,
        currentModeName() {
            return currentModeName
        },
        currentModeRender(geojson, push) {
            return mode().render(geojson, push)
        },
        fire(name, event) {
            const handler = handlers[name]
            // Plain JavaScript callers can name any event
            if (handler) {
                handler(event)
            }
        },
        addEventListeners() {
            on(ctx.map)

            ctx.container.addEventListener("mouseout", mouseout)

            if (ctx.options.keybindings) {
                ctx.container.addEventListener("keydown", keydown)
                ctx.container.addEventListener("keyup", keyup)
            }
        },
        removeEventListeners() {
            off(ctx.map)

            ctx.container.removeEventListener("mouseout", mouseout)

            if (ctx.options.keybindings) {
                ctx.container.removeEventListener("keydown", keydown)
                ctx.container.removeEventListener("keyup", keyup)
            }
        },
        trash() {
            mode().trash()
        },
        combineFeatures() {
            mode().combineFeatures()
        },
        uncombineFeatures() {
            mode().uncombineFeatures()
        },
        getMode() {
            return currentModeName
        },
    }

    return api
}
