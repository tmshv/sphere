import { DEFAULT_MAP_TOOL, isMapTool } from "@/lib/map-tools"
import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { IconHandStop, IconInfoCircle, IconPointer } from "@sphere/icons"
import { SegmentedControl, type SegmentedControlOption } from "@sphere/ui"
import { type CSSProperties, useEffect } from "react"

const ICON_SIZE = 16
const BOTTOM_OFFSET = "var(--sphere-space-12)"
const CENTER_LEFT = "50%"
const CENTER_TRANSFORM = "translateX(-50%)"
const TOOLBAR_Z_INDEX = "var(--sphere-z-index-app)"

const WRAPPER_STYLE: CSSProperties = {
    position: "absolute",
    bottom: BOTTOM_OFFSET,
    left: CENTER_LEFT,
    transform: CENTER_TRANSFORM,
    zIndex: TOOLBAR_Z_INDEX,
}

const OPTIONS: SegmentedControlOption[] = [
    { value: "navigation", label: "Navigation", icon: <IconHandStop size={ICON_SIZE} /> },
    { value: "select", label: "Select", icon: <IconPointer size={ICON_SIZE} /> },
    { value: "info", label: "Info", icon: <IconInfoCircle size={ICON_SIZE} /> },
]

export default function MapToolbar() {
    const dispatch = useAppDispatch()
    const mapTool = useAppSelector(selectMapTool)

    // Escape key returns to default
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                dispatch(actions.app.setMapTool(DEFAULT_MAP_TOOL))
            }
        }
        window.addEventListener("keydown", handler)
        return () => {
            window.removeEventListener("keydown", handler)
        }
    }, [dispatch])

    const zen = useAppSelector(selectors.app.isZen)
    if (zen) {
        return null
    }

    function onChange(value: string) {
        if (isMapTool(value)) {
            dispatch(actions.app.setMapTool(value))
        }
    }

    return (
        <div style={WRAPPER_STYLE}>
            <SegmentedControl label="Map tool" size="sm" options={OPTIONS} value={mapTool} onChange={onChange} />
        </div>
    )
}
