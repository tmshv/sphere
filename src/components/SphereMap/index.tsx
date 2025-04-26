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
import { HandleClick } from "./HandleClick"
import { Projection } from "./Projection"
import { SphereLayer } from "./SphereLayer"
import { HandleHover } from "./HandleHover"
import { selectIsDrawing } from "@/store/draw"
import { Draw } from "./Draw"
import maplibregl from "maplibre-gl"
import { MapboxProtocol } from "@/lib/mapbox-protocol"
import { SphereProtocol } from "@/lib/sphere-protocol"
import logger from "@/logger"
import { PropertiesPopup } from "./PropertiesPopup"

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

const mb = new MapboxProtocol(MAPBOX_ACCESS_TOKEN)
maplibregl.addProtocol(mb.name, mb.createHandler())
const sp = new SphereProtocol()
maplibregl.addProtocol(sp.name, sp.createHandler())

export type SphereMapProps = {
    id: string
}

export const SphereMap: React.FC<SphereMapProps> = ({ id }) => {
    const mapStyle = useAppSelector(selectMapStyle)
    const sky = useAppSelector(selectIsShowSky)
    const terrain = useAppSelector(selectIsShowTerrain)
    const draw = useAppSelector(selectIsDrawing)
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
            <AttributionControl compact />
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
            <PropertiesPopup id={id} />
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
