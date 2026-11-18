import type { Map as MapLibreMap } from "maplibre-gl"
import type { DrawEvents } from "./events"
import type { DrawOptions } from "./options"
import type { DrawSetup } from "./setup"
import type Store from "./store"
import type { DrawUi } from "./ui"

/** The parts of Draw that exist only while it is added to a map. */
export interface AttachedParts {
    map: MapLibreMap
    container: HTMLElement
    store: Store
    events: DrawEvents
    ui: DrawUi
}

function required<T>(value: T | null, name: string): T {
    if (value === null) throw new Error(`MapLibreDraw: ${name} is not available, the control is not added to a map`)
    return value
}

/**
 * State shared by Draw's modules. `options` and `setup` exist from the
 * start; the map, its container, the store, the events and the UI arrive
 * when the control is added to a map. Reading one of those before that
 * throws. `attached` tells whether the control is on a map.
 */
export class DrawContext {
    readonly options: DrawOptions
    /** Whether box zoom was enabled before Draw disabled it for box select. */
    boxZoomInitial = false
    #setup: DrawSetup | null = null
    #map: MapLibreMap | null = null
    #container: HTMLElement | null = null
    #store: Store | null = null
    #events: DrawEvents | null = null
    #ui: DrawUi | null = null

    constructor(options: DrawOptions) {
        this.options = options
    }

    /** Whether Draw is added to a map. */
    get attached(): boolean {
        return this.#map !== null
    }

    get setup(): DrawSetup {
        return required(this.#setup, "setup")
    }

    set setup(setup: DrawSetup) {
        this.#setup = setup
    }

    get map(): MapLibreMap {
        return required(this.#map, "map")
    }

    get container(): HTMLElement {
        return required(this.#container, "container")
    }

    get store(): Store {
        return required(this.#store, "store")
    }

    get events(): DrawEvents {
        return required(this.#events, "events")
    }

    get ui(): DrawUi {
        return required(this.#ui, "ui")
    }

    /** Called when the control is added to a map. */
    attach(parts: AttachedParts): void {
        this.#map = parts.map
        this.#container = parts.container
        this.#store = parts.store
        this.#events = parts.events
        this.#ui = parts.ui
    }

    /**
     * Called when the control is removed from its map. The events and the UI
     * stay, so the current mode can still be read.
     */
    detach(): void {
        this.#map = null
        this.#container = null
        this.#store = null
    }
}
