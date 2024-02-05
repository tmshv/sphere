import MapGl, { Source } from "react-map-gl"
import { useAppSelector } from "@/store/hooks"
import { selectProjection } from "@/store/projection"
import { selectMapStyle } from "@/store/mapStyle"
// import { selectIsShowFog } from "@/store/fog"
import { selectIsShowTerrain } from "@/store/terrain"
import { Terrain } from "./Terrain"
// import { Fog } from "./Fog"
import { SphereSource } from "./SphereSource"
import { SetupStore } from "./SetupStore"
import { HandleClick } from "./HandleClick"
import { SphereLayer } from "./SphereLayer"
import { HandleHover } from "./HandleHover"
import { selectIsDrawing } from "@/store/draw"
import { Draw } from "./Draw"
import maplibregl from "maplibre-gl"
import { MapboxProtocol } from "@/lib/mapbox-protocol"
import { SphereProtocol } from "@/lib/sphere-protocol"
import logger from "@/logger"

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

const mb = new MapboxProtocol(MAPBOX_ACCESS_TOKEN)
maplibregl.addProtocol(mb.name, mb.createHandler())

const sp = new SphereProtocol()
maplibregl.addProtocol(sp.name, sp.createHandler())

export type SphereMapProps = {
    id: string
}

export const SphereMap: React.FC<SphereMapProps> = ({ id }) => {
    const projection = useAppSelector(selectProjection)
    const mapStyle = useAppSelector(selectMapStyle)
    // const fog = useAppSelector(selectIsShowFog)
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
        <MapGl
            mapLib={maplibregl}
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
            projection={projection}
            logoPosition={"bottom-right"}
            onError={(error) => {
                logger.error("Got error from maplibre", error)
            }}
        >
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
            {/* {!fog ? null : (
                <Fog
                    mapId={id}
                />
            )} */}
            {!terrain ? null : (
                <Terrain
                    mapId={id}
                />
            )}
            {/* <Layer
                id="sky"
                type="sky"
                paint={{
                    "sky-type": "atmosphere",
                    "sky-atmosphere-sun": [0.0, 65.0],
                    "sky-atmosphere-sun-intensity": 15,
                }}
            /> */}

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
        </MapGl>
    )
}
