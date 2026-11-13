import * as Constants from "./constants"
import type { DrawFeature } from "./feature_types/draw_feature"
import { requireFeature } from "./feature_types/draw_feature"
import { fireDrawEvent } from "./map-events"
import type Store from "./store"
import type { DrawRenderFeature, FeatureId } from "./types"

/** Events the store has queued for the next render. */
export interface PendingEmits {
    selectionChange: boolean
    deletedFeatures: DrawFeature[]
}

interface GeoJSONSourceLike {
    setData(data: { type: "FeatureCollection"; features: DrawRenderFeature[] }): unknown
}

function isGeoJSONSource(source: unknown): source is GeoJSONSourceLike {
    return typeof source === "object" && source !== null && "setData" in source && typeof source.setData === "function"
}

function requireGeoJSONSource(store: Store, id: string): GeoJSONSourceLike {
    const source = store.ctx.map.getSource(id)
    if (!isGeoJSONSource(source)) throw new TypeError(`Draw source ${id} is missing`)
    return source
}

/** Pushes the store's changed features to the map's hot and cold sources and fires the queued events. */
export default function render(store: Store, pending: PendingEmits): void {
    const mapExists = store.ctx.attached !== false && store.ctx.map.getSource(Constants.sources.HOT) !== undefined
    if (!mapExists) {
        cleanup()
        return
    }

    const mode = store.ctx.events.currentModeName()

    store.ctx.ui.queueMapClasses({ mode })

    let newHotIds: FeatureId[] = []
    let newColdIds: FeatureId[] = []

    if (store.isDirty) {
        newColdIds = store.getAllIds()
    } else {
        newHotIds = store.getChangedIds().filter(id => store.get(id) !== undefined)
        newColdIds = store.sources.hot.flatMap(geojson => {
            const id = geojson.properties.id
            if (id && newHotIds.indexOf(id) === -1 && store.get(id) !== undefined) return [id]
            return []
        })
    }

    store.sources.hot = []
    const lastColdCount = store.sources.cold.length
    store.sources.cold = store.isDirty
        ? []
        : store.sources.cold.filter(geojson => {
              const id = geojson.properties.id || geojson.properties.parent
              return id === undefined || newHotIds.indexOf(id) === -1
          })

    const coldChanged = lastColdCount !== store.sources.cold.length || newColdIds.length > 0
    for (const id of newHotIds) {
        renderFeature(id, "hot")
    }
    for (const id of newColdIds) {
        renderFeature(id, "cold")
    }

    function renderFeature(id: FeatureId, source: "hot" | "cold") {
        const feature = requireFeature(store.get(id))
        const featureInternal = feature.internal(mode)
        store.ctx.events.currentModeRender(featureInternal, geojson => {
            store.sources[source].push(geojson)
        })
    }

    if (coldChanged) {
        requireGeoJSONSource(store, Constants.sources.COLD).setData({
            type: Constants.geojsonTypes.FEATURE_COLLECTION,
            features: store.sources.cold,
        })
    }

    requireGeoJSONSource(store, Constants.sources.HOT).setData({
        type: Constants.geojsonTypes.FEATURE_COLLECTION,
        features: store.sources.hot,
    })

    if (pending.selectionChange) {
        fireDrawEvent(store.ctx.map, Constants.events.SELECTION_CHANGE, {
            features: store.getSelected().map(feature => requireFeature(feature).toGeoJSON()),
            points: store.getSelectedCoordinates().map(coordinate => ({
                type: Constants.geojsonTypes.FEATURE,
                properties: {},
                geometry: {
                    type: Constants.geojsonTypes.POINT,
                    coordinates: coordinate.coordinates,
                },
            })),
        })
        pending.selectionChange = false
    }

    if (pending.deletedFeatures.length) {
        const geojsonToEmit = pending.deletedFeatures.map(feature => feature.toGeoJSON())

        pending.deletedFeatures = []

        fireDrawEvent(store.ctx.map, Constants.events.DELETE, {
            features: geojsonToEmit,
        })
    }

    cleanup()
    fireDrawEvent(store.ctx.map, Constants.events.RENDER, {})

    function cleanup() {
        store.isDirty = false
        store.clearChangedIds()
    }
}
