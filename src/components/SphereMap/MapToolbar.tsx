import { actions, selectors } from "@/store"
import { selectActiveSidebarTab, selectMapTool } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { ActionIcon, Group } from "@mantine/core"
import { IconHandMove, IconRectangle } from "@tabler/icons"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export type MapToolbarProps = {
    mapRef: MapRef | undefined
}

export default function MapToolbar({ mapRef }: MapToolbarProps) {
    const dispatch = useAppDispatch()
    const mapTool = useAppSelector(selectMapTool)
    const activeTab = useAppSelector(selectActiveSidebarTab)

    // Sync dragPan with tool state
    useEffect(() => {
        const map = mapRef?.getMap()
        if (!map) {
            return
        }
        if (mapTool === "select") {
            map.dragPan.disable()
        } else {
            map.dragPan.enable()
        }
    }, [mapRef, mapTool])

    // Reset to pan when leaving Sources tab to prevent dragPan staying disabled
    useEffect(() => {
        if (activeTab !== "sources") {
            dispatch(actions.app.setMapTool("pan"))
        }
    }, [activeTab, dispatch])

    // Escape key returns to pan
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                dispatch(actions.app.setMapTool("pan"))
            }
        }
        window.addEventListener("keydown", handler)
        return () => {
            window.removeEventListener("keydown", handler)
        }
    }, [dispatch])

    const zen = useAppSelector(selectors.app.isZen)

    if (zen || activeTab !== "sources") {
        return null
    }

    return (
        <Group
            spacing={4}
            style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                background: "rgba(0,0,0,0.6)",
                borderRadius: 6,
                padding: "4px",
            }}
        >
            <ActionIcon
                size="md"
                variant={mapTool === "pan" ? "filled" : "subtle"}
                title="Pan"
                onClick={() => dispatch(actions.app.setMapTool("pan"))}
            >
                <IconHandMove size={16} />
            </ActionIcon>
            <ActionIcon
                size="md"
                variant={mapTool === "select" ? "filled" : "subtle"}
                title="Rect Select"
                onClick={() => dispatch(actions.app.setMapTool("select"))}
            >
                <IconRectangle size={16} />
            </ActionIcon>
        </Group>
    )
}
