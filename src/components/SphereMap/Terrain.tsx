import { Source, useMap } from "react-map-gl";
import { useEffect } from "react";

export type TerrainProps = {
    mapId: string
}

export const Terrain: React.FC<TerrainProps> = ({ mapId }) => {
    const { [mapId]: ref } = useMap()

    useEffect(() => {
        return
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const setupTerrain = () => {
            console.log("Map loaded. Ready for set terrain")
            // add the DEM source as a terrain layer with exaggerated height
            map.setTerrain({
                source: 'mapbox-dem',
                exaggeration: 1.5,
            });
        }

        if (map.isStyleLoaded()) {
            setupTerrain()
            return () => {
                map.setTerrain()
            }
        }

        map.on('load', setupTerrain)

        return () => {
            map.off('load', setupTerrain)
            map.setTerrain()
        }
    }, [ref])

    return (
        <Source
            id={"mapbox-dem"}
            type={"raster-dem"}
            url={"mapbox://mapbox.mapbox-terrain-dem-v1"}
        />
    );
}