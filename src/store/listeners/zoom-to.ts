import * as turf from "@turf/turf"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import { getMap } from "@/map"
import { SourceType } from "@/types"
import { actions } from "../actions"
import type { RootState } from ".."
import type { LngLatBoundsLike } from "maplibre-gl"
import { assertUnreachable } from "@/lib"
import { MbtilesReader } from "@/lib/mbtiles"
import { SourceReader } from "@/lib/source-reader"
import logger from "@/logger"
import { MAP_ID } from "@/const"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.source.zoomTo,
    effect: async (action, listenerApi) => {
        const mapId = MAP_ID
        const map = getMap(mapId)
        if (!map) {
            logger.info("No map")
            return
        }

        const sourceId = action.payload
        const state = listenerApi.getOriginalState() as RootState
        const source = state.source.items[sourceId]
        if (!source) {
            logger.info("No source %s", sourceId)
            return
        }

        const { type } = source
        switch (type) {
            case SourceType.FeatureCollection: {
                if (source.dataset) {
                    const bbox = turf.bbox(source.dataset)
                    listenerApi.dispatch(actions.map.fitBounds({
                        mapId,
                        bounds: bbox as LngLatBoundsLike,
                    }))
                }
                break
            }
            case SourceType.Geojson: {
                const reader = new SourceReader(sourceId)
                const bounds = await reader.getBounds()
                if (bounds) {
                    logger.info({ bounds }, "Got bbox")
                    listenerApi.dispatch(actions.map.fitBounds({
                        mapId,
                        bounds,
                    }))
                } else {
                    logger.info("No bounds")
                }
                break
            }
            case SourceType.MVT: {
                const r = new MbtilesReader(sourceId)
                const tilejson = await r.getTileJson()
                if (tilejson?.bounds) {
                    const bounds = tilejson.bounds
                    listenerApi.dispatch(actions.map.fitBounds({
                        mapId,
                        bounds,
                    }))
                }
                break
            }
            case SourceType.Raster: {
                break
            }
            default: {
                assertUnreachable(type)
            }
        }
    },
})

export default listener
