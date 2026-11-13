import type { ModeRuntime } from "../lib/mode_handler"
import type { ChangeModeOptions } from "../types"
import type Mode from "./mode"
import type { ModeContext } from "./mode"

/** A mode as Draw's `modes` option holds it: a `Mode` subclass. */
export type ModeClass = new (ctx: ModeContext, opts: ChangeModeOptions) => Mode

/** Builds a mode runtime for a Draw context and the options passed to `changeMode`. */
export type ModeBuilder = (ctx: ModeContext, startOpts?: ChangeModeOptions) => ModeRuntime

const always = () => true
const never = () => false

/** Draw only handles an event when the mode defines its hook, which saves a render per event. */
function selectorFor(hook: unknown): () => boolean {
    return hook ? always : never
}

/**
 * Turns a `Mode` subclass into the runtime the mode handler drives. The mode
 * is constructed, and so set up, when the runtime starts.
 */
export default function modeBuilder(ModeClass: ModeClass): ModeBuilder {
    return (ctx, startOpts = {}) => {
        let mode: Mode | null = null

        function started(): Mode {
            if (mode === null) throw new Error("The mode is not started")
            return mode
        }

        return {
            start() {
                const m = new ModeClass(ctx, startOpts)
                mode = m
                this.on("drag", selectorFor(m.onDrag), e => m.onDrag?.(e))
                this.on("click", selectorFor(m.onClick), e => m.onClick?.(e))
                this.on("mousemove", selectorFor(m.onMouseMove), e => m.onMouseMove?.(e))
                this.on("mousedown", selectorFor(m.onMouseDown), e => m.onMouseDown?.(e))
                this.on("mouseup", selectorFor(m.onMouseUp), e => m.onMouseUp?.(e))
                this.on("mouseout", selectorFor(m.onMouseOut), e => m.onMouseOut?.(e))
                this.on("keyup", selectorFor(m.onKeyUp), e => m.onKeyUp?.(e))
                this.on("keydown", selectorFor(m.onKeyDown), e => m.onKeyDown?.(e))
                this.on("touchstart", selectorFor(m.onTouchStart), e => m.onTouchStart?.(e))
                this.on("touchmove", selectorFor(m.onTouchMove), e => m.onTouchMove?.(e))
                this.on("touchend", selectorFor(m.onTouchEnd), e => m.onTouchEnd?.(e))
                this.on("tap", selectorFor(m.onTap), e => m.onTap?.(e))
            },
            stop() {
                started().onStop?.()
            },
            trash() {
                started().onTrash?.()
            },
            combineFeatures() {
                started().onCombineFeatures?.()
            },
            uncombineFeatures() {
                started().onUncombineFeatures?.()
            },
            render(geojson, push) {
                started().toDisplayFeatures(geojson, push)
            },
        }
    }
}
