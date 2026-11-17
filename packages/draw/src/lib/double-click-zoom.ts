import type { Interaction } from "../types"

interface Toggle {
    enable(): void
    disable(): void
}

/** What double click zoom toggling needs from a mode: its map and, through its Draw context, the store. */
export interface DoubleClickZoomContext {
    readonly map?: { readonly doubleClickZoom?: Toggle } | null
    readonly ctx?: {
        readonly attached?: boolean
        readonly store?: { getInitialConfigValue?(interaction: Interaction): boolean } | null
    } | null
}

export default {
    enable(ctx: DoubleClickZoomContext): void {
        setTimeout(() => {
            // First check we've got a map and some context.
            const doubleClickZoom = ctx.map?.doubleClickZoom
            const draw = ctx.ctx
            if (!doubleClickZoom || !draw || draw.attached === false) return
            const store = draw.store
            if (!store?.getInitialConfigValue) return
            // Now check initial state wasn't false (we leave it disabled if so)
            if (!store.getInitialConfigValue("doubleClickZoom")) return
            doubleClickZoom.enable()
        }, 0)
    },
    disable(ctx: DoubleClickZoomContext): void {
        setTimeout(() => {
            const doubleClickZoom = ctx.map?.doubleClickZoom
            if (!doubleClickZoom) return
            // Always disable here, as it's necessary in some cases.
            doubleClickZoom.disable()
        }, 0)
    },
}
