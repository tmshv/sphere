import logger from "@/logger"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { Source } from "react-map-gl/maplibre"
import MapGL from "react-map-gl/maplibre"
import MapBody from "./map-body"

export type SphereMapProps = {
    id: string
}

export const SphereMap: React.FC<SphereMapProps> = ({ id }) => {
    const mapStyle = useAppSelector(selectors.mapStyle.style)
    const showTerrain = useAppSelector(selectors.terrain.show)

    return (
        <MapGL
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
            onError={error => {
                logger.error("Got maplibre error %s", error)
            }}
        >
            {showTerrain && (
                <Source id={"mapbox-dem"} type={"raster-dem"} url={"mapbox://mapbox.mapbox-terrain-dem-v1"} />
            )}
            <MapBody mapId={id} />
        </MapGL>
    )
}
