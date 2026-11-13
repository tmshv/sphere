import type { Map as MapLibreMap } from "maplibre-gl"
import events from "./events"
import Store from "./store"
import ui from "./ui"
import * as Constants from "./constants"
import type { DrawContext } from "./context"

/** How often Draw checks whether a map that was not loaded on add has loaded, in ms. */
const MAP_LOADED_POLL_INTERVAL = 16

export interface DrawSetup {
    onRemove(): void
    connect(): void
    onAdd(map: MapLibreMap): HTMLElement
    addLayers(): void
    removeLayers(): void
}

export default function runSetup(ctx: DrawContext): DrawSetup {
    let controlContainer: HTMLElement | null = null
    let mapLoadedInterval: ReturnType<typeof setInterval> | undefined

    const setup: DrawSetup = {
        onRemove() {
            // Stop connect attempt in the event that control is removed before map is loaded
            ctx.map.off("load", setup.connect)
            clearInterval(mapLoadedInterval)

            setup.removeLayers()
            ctx.store.restoreMapConfig()
            ctx.ui.removeButtons()
            ctx.events.removeEventListeners()
            ctx.ui.clearMapClasses()
            if (ctx.boxZoomInitial) ctx.map.boxZoom.enable()
            ctx.detach()

            if (controlContainer?.parentNode) controlContainer.parentNode.removeChild(controlContainer)
            controlContainer = null
        },
        connect() {
            ctx.map.off("load", setup.connect)
            clearInterval(mapLoadedInterval)
            setup.addLayers()
            ctx.store.storeMapConfig()
            ctx.events.addEventListeners()
        },
        onAdd(map) {
            ctx.attach({
                map,
                events: events(ctx),
                ui: ui(ctx),
                container: map.getContainer(),
                store: new Store(ctx),
            })

            const addedContainer = ctx.ui.addButtons()
            controlContainer = addedContainer

            if (ctx.options.boxSelect) {
                ctx.boxZoomInitial = map.boxZoom.isEnabled()
                map.boxZoom.disable()
                // Need to toggle dragPan on and off or else first
                // dragPan disable attempt in simple_select doesn't work
                map.dragPan.disable()
                map.dragPan.enable()
            }

            if (map.loaded()) {
                setup.connect()
            } else {
                map.on("load", setup.connect)
                mapLoadedInterval = setInterval(() => {
                    if (map.loaded()) setup.connect()
                }, MAP_LOADED_POLL_INTERVAL)
            }

            ctx.events.start()
            return addedContainer
        },
        addLayers() {
            // drawn features style
            ctx.map.addSource(Constants.sources.COLD, {
                data: {
                    type: Constants.geojsonTypes.FEATURE_COLLECTION,
                    features: [],
                },
                type: "geojson",
            })

            // hot features style
            ctx.map.addSource(Constants.sources.HOT, {
                data: {
                    type: Constants.geojsonTypes.FEATURE_COLLECTION,
                    features: [],
                },
                type: "geojson",
            })

            for (const style of ctx.options.styles) {
                ctx.map.addLayer(style)
            }

            ctx.store.setDirty()
            ctx.store.render()
        },
        // Check for layers and sources before attempting to remove
        // If user adds draw control and removes it before the map is loaded, layers and sources will be missing
        removeLayers() {
            for (const style of ctx.options.styles) {
                if (ctx.map.getLayer(style.id)) {
                    ctx.map.removeLayer(style.id)
                }
            }

            if (ctx.map.getSource(Constants.sources.COLD)) {
                ctx.map.removeSource(Constants.sources.COLD)
            }

            if (ctx.map.getSource(Constants.sources.HOT)) {
                ctx.map.removeSource(Constants.sources.HOT)
            }
        },
    }

    ctx.setup = setup

    return setup
}
