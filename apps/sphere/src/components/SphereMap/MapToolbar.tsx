import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { DEFAULT_MAP_TOOL, type MapTool } from "@/lib/map-tools"
import { IconButton, Row } from "@sphere/ui"
import { type IconComponent, IconHandStop, IconInfoCircle, IconPointer } from "@sphere/icons"
import { useEffect } from "react"

type ToolSpec = { tool: MapTool; title: string; Icon: IconComponent }

const TOOLS: ToolSpec[] = [
    { tool: "navigation", title: "Navigation", Icon: IconHandStop },
    { tool: "select", title: "Select", Icon: IconPointer },
    { tool: "info", title: "Info", Icon: IconInfoCircle },
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

    return (
        <Row
            gap="xs"
            style={{
                position: "absolute",
                bottom: 12,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                background: "rgba(0,0,0,0.6)",
                borderRadius: 6,
                padding: "4px",
            }}
        >
            {TOOLS.map(({ tool, title, Icon }) => (
                <IconButton
                    key={tool}
                    appearance="solid"
                    active={mapTool === tool}
                    label={title}
                    icon={<Icon size={16} />}
                    onClick={() => dispatch(actions.app.setMapTool(tool))}
                />
            ))}
        </Row>
    )
}
