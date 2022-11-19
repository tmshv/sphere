import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Layer } from "react-map-gl";
import { useAppSelector } from "@/store/hooks";
import { selectProjection } from "@/store/projection";
import { selectMapStyle } from "@/store/mapStyle";
import { selectIsShowFog } from "@/store/fog";
import { selectIsShowTerrain } from "@/store/terrain";
import { Terrain } from "./Terrain";
import { Fog } from "./Fog";
import { SphereSource } from "./SphereSource";
import { SetupStore } from "./SetupStore";
import { HandleClick } from "./HandleClick";
import { SphereLayer } from "./SphereLayer";

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

export type SphereMapProps = {
    id: string
}

export const SphereMap: React.FC<SphereMapProps> = ({ id }) => {
    const projection = useAppSelector(selectProjection)
    const mapStyle = useAppSelector(selectMapStyle)
    const showFog = useAppSelector(selectIsShowFog)
    const showTerrain = useAppSelector(selectIsShowTerrain)
    const sourceIds = useAppSelector(state => state.source.allIds)
    const layerIds = useAppSelector(state => state.layer.allIds)

    return (
        <Map
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
            mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
            mapStyle={mapStyle}
            projection={projection}
            logoPosition={"bottom-right"}
        >
            <SetupStore
                mapId={id}
            />
            <HandleClick
                mapId={id}
            />
            {!showFog ? null : (
                <Fog
                    mapId={id}
                />
            )}
            {!showTerrain ? null : (
                <Terrain
                    mapId={id}
                />
            )}
            <Layer
                id="sky"
                type="sky"
                paint={{
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 65.0],
                    'sky-atmosphere-sun-intensity': 15
                }}
            />

            {sourceIds.map(id => (
                <SphereSource
                    key={id}
                    id={id}
                />
            ))}
            {layerIds.map(id => (
                <SphereLayer
                    key={id}
                    id={id}
                />
            ))}
        </Map>
    );
}
