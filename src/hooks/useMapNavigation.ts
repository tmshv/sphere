import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import { useAppSelector } from "@/store/hooks"
import { selectors } from "@/store/selectors"

export default function useMapNavigation(ref?: MapRef): void {
    const dragPan = useAppSelector(selectors.mapInteraction.selectDragPan)
    const scrollZoom = useAppSelector(selectors.mapInteraction.selectScrollZoom)
    const dragRotate = useAppSelector(selectors.mapInteraction.selectDragRotate)
    const navigationEnabled = useAppSelector(selectors.tools.selectNavigationEnabled)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const effectiveDragPan = navigationEnabled && dragPan
        const effectiveScrollZoom = navigationEnabled && scrollZoom
        const effectiveDragRotate = navigationEnabled && dragRotate

        const sync = () => {
            if (effectiveDragPan) {
                map.dragPan.enable()
            } else {
                map.dragPan.disable()
            }
            if (effectiveScrollZoom) {
                map.scrollZoom.enable()
            } else {
                map.scrollZoom.disable()
            }
            if (effectiveDragRotate) {
                map.dragRotate.enable()
            } else {
                map.dragRotate.disable()
            }
        }

        sync()
    }, [ref, dragPan, scrollZoom, dragRotate, navigationEnabled])
}
