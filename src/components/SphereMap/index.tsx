import { Source } from "react-map-gl/maplibre"
import Maplibre, { AttributionControl } from "react-map-gl/maplibre"
import { useAppSelector } from "@/store/hooks"
import { selectMapStyle } from "@/store/mapStyle"
import { selectIsShowSky } from "@/store/sky"
import { selectIsShowTerrain } from "@/store/terrain"
import { Terrain } from "./Terrain"
import { Sky } from "./Sky"
import { SphereSource } from "./SphereSource"
import { SetupStore } from "./SetupStore"
import HandleClick from "./handle-click"
import { Projection } from "./Projection"
import { SphereLayer } from "./SphereLayer"
import { HandleHover } from "./HandleHover"
import { selectIsDrawing } from "@/store/draw"
import { Draw } from "./Draw"
import logger from "@/logger"
import HandleFeatureProperties from "./handle-feature-properties"
import { selectShowAttribution } from "@/store/app"

export type SphereMapProps = {
    id: string
}

export const SphereMap: React.FC<SphereMapProps> = ({ id }) => {
    const mapStyle = useAppSelector(selectMapStyle)
    const sky = useAppSelector(selectIsShowSky)
    const terrain = useAppSelector(selectIsShowTerrain)
    const draw = useAppSelector(selectIsDrawing)
    const showAttribution = useAppSelector(selectShowAttribution)
    const sourceIds = useAppSelector(state => state.source.allIds)
    const layers = useAppSelector(state => {
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
            <Projection fallback="mercator" />
            {!showAttribution ? null : (
                <AttributionControl compact />
            )}
            <SetupStore
                mapId={id}
            />
            <Source
                id={"mapbox-dem"}
                type={"raster-dem"}
                url={"mapbox://mapbox.mapbox-terrain-dem-v1"}
            />
            <HandleHover
                mapId={id}
            />
            <HandleClick />
            <HandleFeatureProperties id={id} delay={50} />
            {!sky ? null : (
                <Sky
                    mapId={id}
                />
            )}
            {!terrain ? null : (
                <Terrain
                    mapId={id}
                />
            )}
            {sourceIds.map(id => (
                <SphereSource
                    key={id}
                    id={id}
                />
            ))}
            {draw ? (<Draw />) : layers.map(({ id }) => (
                <SphereLayer
                    key={id}
                    id={id}
                />
            ))}
        </Maplibre>
    )
}
