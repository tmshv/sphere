import { Source } from "react-map-gl/maplibre"
import Maplibre, { AttributionControl } from "react-map-gl/maplibre"
import { useAppSelector } from "@/store/hooks"
import { selectMapStyle } from "@/store/mapStyle"
import { selectIsShowSky } from "@/store/sky"
import { Sky } from "./Sky"
import { SphereSource } from "./SphereSource"
import HandleClick from "./handle-click"
import { SphereLayer } from "./SphereLayer"
import { selectIsDrawing } from "@/store/draw"
import Draw from "./Draw"
import logger from "@/logger"
import HandleFeatureProperties from "./handle-feature-properties"
import { selectShowAttribution } from "@/store/app"
import MapBody from "./map-body"

export type SphereMapProps = {
    id: string
}

export const SphereMap: React.FC<SphereMapProps> = ({ id }) => {
    const mapStyle = useAppSelector(selectMapStyle)
    const sky = useAppSelector(selectIsShowSky)
    const draw = useAppSelector(selectIsDrawing)
    const showAttribution = useAppSelector(selectShowAttribution)
    const sourceIds = useAppSelector(state => state.source.allIds)
    const layers = useAppSelector(state => {
        // Do not show layers in draw mode
        if (draw) {
            return []
        }
        return state.layer.allIds
            .map(id => {
                const layer = state.layer.items[id]
                return {
                    id: layer.id,
                    index: layer.fractionIndex,
                }
            })
            .sort((a, b) => a.index - b.index)
    })

    return (
        <Maplibre
            id={id}
            trackResize
            initialViewState={{
                longitude: 26.351821433680755,
                latitude: 30.0194833642568,
                zoom: 1.76,
                pitch: 0,
                bearing: 0,
            }}
            maxPitch={85}
            mapStyle={mapStyle}
            logoPosition={"bottom-right"}
            attributionControl={false}
            onError={(error) => {
                logger.error("Got maplibre error", error)
            }}
        >
            {!showAttribution ? null : (
                <AttributionControl compact />
            )}
            <Source
                id={"mapbox-dem"}
                type={"raster-dem"}
                url={"mapbox://mapbox.mapbox-terrain-dem-v1"}
            />
            <MapBody
                mapId={id}
            />
            <HandleClick />
            <HandleFeatureProperties id={id} delay={50} />
            {!sky ? null : (
                <Sky
                    mapId={id}
                />
            )}
            {sourceIds.map(id => (
                <SphereSource
                    key={id}
                    id={id}
                />
            ))}
            {!draw ? null : (
                <Draw mapId={id} />
            )}
            {layers.map(({ id }) => (
                <SphereLayer
                    key={id}
                    id={id}
                />
            ))}
        </Maplibre>
    )
}
