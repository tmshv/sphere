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

        if (!effectiveDragPan) {
            // The draw control mutates dragPan internally (setup toggle, box-select
            // end, direct-select drag end). Re-sync after these operations complete.
            // touchend is included because Draw's touch handlers also call dragPan.enable().
            // Defer mouseup/touchend sync via setTimeout so it runs after Draw's own
            // handlers (registered later, thus higher in listener order) have already
            // re-enabled dragPan — ensuring our disable wins regardless of mount order.
            let timerId: ReturnType<typeof setTimeout> | undefined
            const deferredSync = () => {
                clearTimeout(timerId)
                timerId = setTimeout(sync, 0)
            }
            map.on("mouseup", deferredSync)
            map.on("touchend", deferredSync)
            map.on("draw.modechange", sync)
            return () => {
                clearTimeout(timerId)
                map.off("mouseup", deferredSync)
                map.off("touchend", deferredSync)
                map.off("draw.modechange", sync)
            }
        }
    }, [ref, dragPan, scrollZoom, dragRotate, navigationEnabled])
}
