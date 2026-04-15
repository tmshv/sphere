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
        const effectiveScrollZoom = scrollZoom
        const effectiveDragRotate = navigationEnabled && dragRotate

        // Shift+drag is reserved for rect-select; MapLibre's built-in box zoom
        // would otherwise draw its own rectangle and zoom on release.
        map.boxZoom.disable()

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
    }, [ref, dragPan, scrollZoom, dragRotate, navigationEnabled])
}
