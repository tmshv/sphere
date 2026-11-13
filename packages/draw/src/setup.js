import events from "./events"
import Store from "./store"
import ui from "./ui"
import * as Constants from "./constants"

export default function (ctx) {
    let controlContainer = null
    let mapLoadedInterval = null

    const setup = {
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
            ctx.map = null
            ctx.container = null
            ctx.store = null

            if (controlContainer?.parentNode) controlContainer.parentNode.removeChild(controlContainer)
            controlContainer = null

            return this
        },
        connect() {
            ctx.map.off("load", setup.connect)
            clearInterval(mapLoadedInterval)
            setup.addLayers()
            ctx.store.storeMapConfig()
            ctx.events.addEventListeners()
        },
        onAdd(map) {
            if (process.env.NODE_ENV !== "test") {
                // Monkey patch to resolve breaking change to `fire` introduced by
                // mapbox-gl-js. See mapbox/mapbox-gl-draw/issues/766.
                const originalFire = map.fire
                map.fire = (...args) => {
                    if (originalFire.length === 1 && args.length !== 1) {
                        const [type, event] = args
                        return originalFire.call(map, { type, ...event })
                    }
                    return originalFire.apply(map, args)
                }
            }

            ctx.map = map
            ctx.events = events(ctx)
            ctx.ui = ui(ctx)
            ctx.container = map.getContainer()
            ctx.store = new Store(ctx)

            controlContainer = ctx.ui.addButtons()

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
                }, 16)
            }

            ctx.events.start()
            return controlContainer
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

            ctx.store.setDirty(true)
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
