import type { DrawModeEventMap, DrawModeEventName, DrawRenderFeature, FeatureId, HandlerResult } from "../types"

export type RenderPush = (geojson: DrawRenderFeature) => void

/** The `this` of a mode's `start`: registers event handlers and requests re-renders. */
export interface ModeLifecycle {
    on<K extends DrawModeEventName>(
        event: K,
        selector: (e: DrawModeEventMap[K]) => boolean,
        fn: (this: ModeLifecycle, e: DrawModeEventMap[K]) => HandlerResult,
    ): void
    render(id: FeatureId): void
}

/** A mode as the mode handler drives it; `objectToMode` builds one from a mode object. */
export interface ModeRuntime {
    start(this: ModeLifecycle): void
    stop?(): void
    trash?(): void
    combineFeatures?(): void
    uncombineFeatures?(): void
    render(geojson: DrawRenderFeature, push: RenderPush): void
}

/** What the mode handler needs from the Draw context. */
export interface ModeHandlerContext {
    readonly store: {
        featureChanged(id: FeatureId): unknown
        render(): void
    }
    readonly ui: {
        updateMapClasses(): void
    }
}

interface Handler<K extends DrawModeEventName> {
    selector: (e: DrawModeEventMap[K]) => boolean
    fn: (this: ModeLifecycle, e: DrawModeEventMap[K]) => HandlerResult
}

type HandlerLists = { [K in DrawModeEventName]: Handler<K>[] }

export interface ModeHandle {
    render: ModeRuntime["render"]
    stop(): void
    trash(): void
    combineFeatures(): void
    uncombineFeatures(): void
    drag(event: DrawModeEventMap["drag"]): void
    click(event: DrawModeEventMap["click"]): void
    mousemove(event: DrawModeEventMap["mousemove"]): void
    mousedown(event: DrawModeEventMap["mousedown"]): void
    mouseup(event: DrawModeEventMap["mouseup"]): void
    mouseout(event: DrawModeEventMap["mouseout"]): void
    keydown(event: DrawModeEventMap["keydown"]): void
    keyup(event: DrawModeEventMap["keyup"]): void
    touchstart(event: DrawModeEventMap["touchstart"]): void
    touchmove(event: DrawModeEventMap["touchmove"]): void
    touchend(event: DrawModeEventMap["touchend"]): void
    tap(event: DrawModeEventMap["tap"]): void
}

const ModeHandler = (mode: ModeRuntime, DrawContext: ModeHandlerContext): ModeHandle => {
    const handlers: HandlerLists = {
        drag: [],
        click: [],
        mousemove: [],
        mousedown: [],
        mouseup: [],
        mouseout: [],
        keydown: [],
        keyup: [],
        touchstart: [],
        touchmove: [],
        touchend: [],
        tap: [],
    }

    const ctx: ModeLifecycle = {
        on(event, selector, fn) {
            const list = handlers[event]
            // Custom modes are plain JavaScript and may name an unknown event
            if (list === undefined) {
                throw new Error(`Invalid event type: ${event}`)
            }
            list.push({
                selector,
                fn,
            })
        },
        render(id) {
            DrawContext.store.featureChanged(id)
        },
    }

    const delegate = <K extends DrawModeEventName>(eventName: K, event: DrawModeEventMap[K]) => {
        // The most recently registered handler goes first
        const handles = [...handlers[eventName]].reverse()
        for (const handle of handles) {
            if (handle.selector(event)) {
                const skipRender = handle.fn.call(ctx, event)
                if (!skipRender) {
                    DrawContext.store.render()
                }
                DrawContext.ui.updateMapClasses()

                // ensure an event is only handled once
                // we do this to let modes have multiple overlapping selectors
                // and relay on order of oppertations to filter
                break
            }
        }
    }

    mode.start.call(ctx)

    return {
        render: mode.render,
        stop() {
            if (mode.stop) mode.stop()
        },
        trash() {
            if (mode.trash) {
                mode.trash()
                DrawContext.store.render()
            }
        },
        combineFeatures() {
            if (mode.combineFeatures) {
                mode.combineFeatures()
            }
        },
        uncombineFeatures() {
            if (mode.uncombineFeatures) {
                mode.uncombineFeatures()
            }
        },
        drag(event) {
            delegate("drag", event)
        },
        click(event) {
            delegate("click", event)
        },
        mousemove(event) {
            delegate("mousemove", event)
        },
        mousedown(event) {
            delegate("mousedown", event)
        },
        mouseup(event) {
            delegate("mouseup", event)
        },
        mouseout(event) {
            delegate("mouseout", event)
        },
        keydown(event) {
            delegate("keydown", event)
        },
        keyup(event) {
            delegate("keyup", event)
        },
        touchstart(event) {
            delegate("touchstart", event)
        },
        touchmove(event) {
            delegate("touchmove", event)
        },
        touchend(event) {
            delegate("touchend", event)
        },
        tap(event) {
            delegate("tap", event)
        },
    }
}

export default ModeHandler
