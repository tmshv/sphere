// Minimal event emitter for the mock map, restored from upstream
// mapbox-gl-draw `bench/lib/evented.js` (removed in the maplibre fork).
export default class Evented {
    on(type, listener) {
        this.listeners = this.listeners || {}
        this.listeners[type] = this.listeners[type] || []
        this.listeners[type].push(listener)
        return this
    }

    off(type, listener) {
        if (!this.listeners) return this
        const listeners = this.listeners[type]
        if (!listeners) return this
        const index = listeners.indexOf(listener)
        if (index !== -1) listeners.splice(index, 1)
        return this
    }

    fire(type, data) {
        if (!this.listeners) return this
        const listeners = this.listeners[type]
        if (!listeners) return
        for (const listener of listeners) {
            listener.call(this, data)
        }
    }
}
