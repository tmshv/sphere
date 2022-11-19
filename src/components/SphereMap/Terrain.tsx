import { useMap } from "react-map-gl";
import { useEffect } from "react";
import { useAppSelector } from "../../store/hooks";
import { selectExaggeration } from "../../store/terrain";

export type TerrainProps = {
    mapId: string
}

export const Terrain: React.FC<TerrainProps> = ({ mapId }) => {
    const { [mapId]: ref } = useMap()
    const exaggeration = useAppSelector(selectExaggeration)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const setupTerrain = () => {
            // add the DEM source as a terrain layer with exaggerated height
            map.setTerrain({
                source: 'mapbox-dem',
                exaggeration,
            });
        }

        if (map.isStyleLoaded()) {
            setupTerrain()

            return () => {
                if (map.isStyleLoaded()) {
                    map.setTerrain()
                }
            }
        }

        map.on('load', setupTerrain)

        return () => {
            map.off('load', setupTerrain)
            if (map.isStyleLoaded()) {
                map.setTerrain()
            }
        }
    }, [ref, exaggeration])

    return null
}
