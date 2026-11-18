// Minimal event emitter for the mock map, restored from upstream
// mapbox-gl-draw `bench/lib/evented.js` (removed in the maplibre fork).

/** A listener gets whatever data the event was fired with. */
export type Listener = (data: unknown) => void

/** Anything test helpers can fire map events on. */
export interface EventFirer {
    fire(type: string, data?: unknown): unknown
}

export default class Evented implements EventFirer {
    #listeners = new Map<string, Listener[]>()

    on(type: string, listener: Listener): this {
        const listeners = this.#listeners.get(type)
        if (listeners) {
            listeners.push(listener)
        } else {
            this.#listeners.set(type, [listener])
        }
        return this
    }

    off(type: string, listener: Listener): this {
        const listeners = this.#listeners.get(type)
        if (!listeners) return this
        const index = listeners.indexOf(listener)
        if (index !== -1) listeners.splice(index, 1)
        return this
    }

    fire(type: string, data?: unknown): this {
        const listeners = this.#listeners.get(type)
        if (!listeners) return this
        for (const listener of listeners) {
            listener.call(this, data)
        }
        return this
    }
}
