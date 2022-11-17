import { useMap } from "react-map-gl";
import { useEffect } from "react";
import { removeMap, setMap } from "../../map";

export type SetupStoreProps = {
    mapId: string
}

export const SetupStore: React.FC<SetupStoreProps> = ({ mapId }) => {
    const { [mapId]: ref } = useMap()

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const handler = () => {
            setMap(mapId, map)
        }

        if (map.isStyleLoaded()) {
            handler()
            return () => {
                removeMap(mapId)
            }
        }

        map.on('load', handler)

        return () => {
            map.off('load', handler)
            removeMap(mapId)
        }
    }, [ref, mapId])

    return null
}
