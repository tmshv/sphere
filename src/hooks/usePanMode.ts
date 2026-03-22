import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import { useAppSelector } from "@/store/hooks"
import { selectors } from "@/store/selectors"

export default function usePanMode(ref?: MapRef): void {
    const panEnabled = useAppSelector(selectors.tools.selectPanEnabled)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        if (panEnabled) {
            map.dragPan.enable()
        } else {
            map.dragPan.disable()
        }
    }, [ref, panEnabled])
}
