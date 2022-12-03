import { useMap } from "react-map-gl"
import { useEffect } from "react"

export type FogProps = {
    mapId: string
}

export const Fog: React.FC<FogProps> = ({ mapId }) => {
    const { [mapId]: ref } = useMap()

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const cb = () => {
            // add sky styling with `setFog` that will show when the map is highly pitched
            map.setFog({
                // 'horizon-blend': 0.3,
                // 'color': '#f8f0e3',
                // 'high-color': '#add8e6',
                // 'space-color': '#d8f2ff',
                // 'star-intensity': 0.0
            })
        }

        if (map.isStyleLoaded()) {
            cb()
            return () => {
                if (map.isStyleLoaded()) {
                    map.setFog(null as any)
                }
            }
        }

        map.on("load", cb)

        return () => {
            map.off("load", cb)
            if (map.isStyleLoaded()) {
                map.setFog(null as any)
            }
        }
    }, [ref])

    return null
}
