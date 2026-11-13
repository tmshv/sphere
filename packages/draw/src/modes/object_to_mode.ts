import ModeInterface, { type DrawModeObject, type ModeContext } from "./mode_interface"
import type { ModeRuntime } from "../lib/mode_handler"

/** Builds a mode runtime for a Draw context and the options passed to `changeMode`. */
export type ModeBuilder = (ctx: ModeContext, startOpts?: unknown) => ModeRuntime

/** A handler only runs when the mode object defines its hook. */
function selectorFor(hook: unknown): () => boolean {
    if (hook) return () => true
    return () => false
}

export default function objectToMode(modeObject: DrawModeObject): ModeBuilder {
    return (ctx, startOpts = {}) => {
        let state: unknown = {}

        const mode: DrawModeObject & ModeInterface = Object.assign(new ModeInterface(ctx), modeObject)

        return {
            start() {
                state = mode.onSetup(startOpts) // this should set ui buttons

                // Adds event handlers for all event options
                // add sets the selector to false for all
                // handlers that are not present in the mode
                // to reduce on render calls for functions that
                // have no logic
                this.on("drag", selectorFor(modeObject.onDrag), e => mode.onDrag(state, e))
                this.on("click", selectorFor(modeObject.onClick), e => mode.onClick(state, e))
                this.on("mousemove", selectorFor(modeObject.onMouseMove), e => mode.onMouseMove(state, e))
                this.on("mousedown", selectorFor(modeObject.onMouseDown), e => mode.onMouseDown(state, e))
                this.on("mouseup", selectorFor(modeObject.onMouseUp), e => mode.onMouseUp(state, e))
                this.on("mouseout", selectorFor(modeObject.onMouseOut), e => mode.onMouseOut(state, e))
                this.on("keyup", selectorFor(modeObject.onKeyUp), e => mode.onKeyUp(state, e))
                this.on("keydown", selectorFor(modeObject.onKeyDown), e => mode.onKeyDown(state, e))
                this.on("touchstart", selectorFor(modeObject.onTouchStart), e => mode.onTouchStart(state, e))
                this.on("touchmove", selectorFor(modeObject.onTouchMove), e => mode.onTouchMove(state, e))
                this.on("touchend", selectorFor(modeObject.onTouchEnd), e => mode.onTouchEnd(state, e))
                this.on("tap", selectorFor(modeObject.onTap), e => mode.onTap(state, e))
            },
            stop() {
                mode.onStop(state)
            },
            trash() {
                mode.onTrash(state)
            },
            combineFeatures() {
                mode.onCombineFeatures(state)
            },
            uncombineFeatures() {
                mode.onUncombineFeatures(state)
            },
            render(geojson, push) {
                mode.toDisplayFeatures(state, geojson, push)
            },
        }
    }
}
