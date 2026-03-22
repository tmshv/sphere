import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import { useAppSelector } from "@/store/hooks"
import { selectors } from "@/store/selectors"

export default function usePanMode(ref?: MapRef): void {
    const panEnabled = useAppSelector(selectors.tools.selectPanEnabled)
    const drawing = useAppSelector(selectors.draw.isDrawing)

    // biome-ignore lint/correctness/useExhaustiveDependencies: drawing is a trigger dep — re-syncs when Draw mounts and its onAdd re-enables dragPan
    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const sync = () => {
            if (panEnabled) {
                map.dragPan.enable()
            } else {
                map.dragPan.disable()
            }
        }

        sync()

        if (!panEnabled) {
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
    }, [ref, panEnabled, drawing])
}
