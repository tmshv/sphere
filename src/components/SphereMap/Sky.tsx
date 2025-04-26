import { useMap } from "react-map-gl/maplibre"
import { useEffect } from "react"

export type SkyProps = {
    mapId: string
}

export const Sky: React.FC<SkyProps> = ({ mapId }) => {
    const { [mapId]: ref } = useMap()

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const cb = () => {
            map.setSky({
                "sky-color": "#0d7fca",
                "sky-horizon-blend": 0.5,
                "horizon-color": "#abf8ff",
                "horizon-fog-blend": 0.5,
                "fog-color": "#545669",
                "fog-ground-blend": 0,
            })
        }

        if (map.isStyleLoaded()) {
            cb()
            return () => {
                if (map.isStyleLoaded()) {
                    // @ts-ignore
                    map.setSky(undefined)
                }
            }
        }

        map.on("load", cb)
        return () => {
            map.off("load", cb)
            if (map.isStyleLoaded()) {
                // @ts-ignore
                map.setSky(undefined)
            }
        }
    }, [ref])

    return null
}
