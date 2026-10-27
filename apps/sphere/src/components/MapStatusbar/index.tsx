import { MAP_ID } from "@/const"
import { useCursor } from "@/hooks/useCursor"
import { usePitch } from "@/hooks/usePitch"
import { useZoom } from "@/hooks/useZoom"
import { actions } from "@/store"
import { selectors } from "@/store"
import { selectMapTool, selectShowLeftSidebar, selectVersion } from "@/store/app"
import { selectErrorMessage } from "@/store/error"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectSourcesAmount } from "@/store/source"
import { selectIsShowTerrain } from "@/store/terrain"
import { Statusbar, StatusbarBadge, StatusbarButton } from "@sphere/ui"
import {
    IconHandStop,
    IconInfoCircle,
    IconLayoutSidebar,
    IconLiveView,
    IconMountain,
    IconMountainOff,
    IconNorthStar,
    IconPointer,
    IconWorld,
    IconWorldOff,
} from "@tabler/icons"
import { type CSSProperties, useCallback } from "react"
import { useMap } from "react-map-gl/maplibre"

const SPACER_STYLE: CSSProperties = { flex: 1 }
const ICON_SIZE_PX = 16
const SELECTED_PAD_LENGTH = 5
const NBSP = "\u00a0"

function round(value: number, n: number): number {
    return Math.round(value * n) / n
}

function format(value: number, floatingLength: number): string {
    const [a, b] = `${value}`.split(".")
    if (!b) {
        return a
    }

    const c = b.padEnd(floatingLength)
    return `${a}.${c}`
}

export type MapStatusbarProps = {
    id: string
}

export function MapStatusbar({ id }: MapStatusbarProps) {
    const dispatch = useAppDispatch()
    const { [id]: ref } = useMap()
    const [lng, lat] = useCursor(ref)
    const zoom = useZoom(ref)
    const pitch = usePitch(ref)

    const sidebar = useAppSelector(selectShowLeftSidebar)
    const version = useAppSelector(selectVersion)
    const sources = useAppSelector(selectSourcesAmount)
    const projection = useAppSelector(selectors.projection.projection)
    const changeProjection = useAppSelector(selectors.projection.changeProjectionAvailable)
    const terrain = useAppSelector(selectIsShowTerrain)
    const errorMessage = useAppSelector(selectErrorMessage)
    const mapTool = useAppSelector(selectMapTool)
    const selectedCount = useAppSelector(selectors.selection.count)
    const isGlobe = projection === "globe"

    const toggleSidebar = useCallback(() => {
        if (sidebar) {
            dispatch(actions.app.hideLeftSidebar())
        } else {
            dispatch(actions.app.showLeftSidebar())
        }
    }, [dispatch, sidebar])

    const printViewport = useCallback(() => {
        dispatch(actions.map.printViewport({ mapId: MAP_ID }))
    }, [dispatch])

    const resetNorth = useCallback(() => {
        dispatch(actions.map.resetNorth({ mapId: MAP_ID }))
    }, [dispatch])

    const toggleTerrain = useCallback(() => {
        dispatch(actions.terrain.toggle())
    }, [dispatch])

    const toggleProjection = useCallback(() => {
        if (isGlobe) {
            dispatch(actions.projection.setFlat())
        } else {
            dispatch(actions.projection.setGlobe())
        }
    }, [dispatch, isGlobe])

    return (
        <Statusbar>
            <StatusbarButton
                icon={<IconLayoutSidebar size={ICON_SIZE_PX} />}
                label="Toggle sidebar"
                active={sidebar}
                activeLook="fill"
                onClick={toggleSidebar}
            />

            <StatusbarBadge>sources={sources}</StatusbarBadge>
            <StatusbarBadge>selected={`${selectedCount}`.padEnd(SELECTED_PAD_LENGTH, NBSP)}</StatusbarBadge>
            <StatusbarBadge width="short">pitch={format(round(pitch, 1000), 3)}</StatusbarBadge>
            <StatusbarBadge width="short">zoom={format(round(zoom, 1000), 3)}</StatusbarBadge>
            <StatusbarBadge width="long" title="Longitude">
                lng={format(round(lng, 1000000), 5)}
            </StatusbarBadge>
            <StatusbarBadge width="long" title="Latitude">
                lat={format(round(lat, 1000000), 5)}
            </StatusbarBadge>

            {!errorMessage ? null : (
                <StatusbarBadge tone="error" title="Error">
                    {errorMessage}
                </StatusbarBadge>
            )}

            <div style={SPACER_STYLE} />

            <StatusbarButton
                icon={<IconHandStop size={ICON_SIZE_PX} />}
                label="Navigation"
                active={mapTool === "navigation"}
                onClick={() => dispatch(actions.app.setMapTool("navigation"))}
            />
            <StatusbarButton
                icon={<IconPointer size={ICON_SIZE_PX} />}
                label="Select"
                active={mapTool === "select"}
                onClick={() => dispatch(actions.app.setMapTool("select"))}
            />
            <StatusbarButton
                icon={<IconInfoCircle size={ICON_SIZE_PX} />}
                label="Info"
                active={mapTool === "info"}
                onClick={() => dispatch(actions.app.setMapTool("info"))}
            />

            <StatusbarButton
                icon={<IconLiveView size={ICON_SIZE_PX} />}
                label="Print viewport"
                onClick={printViewport}
            />
            <StatusbarButton icon={<IconNorthStar size={ICON_SIZE_PX} />} label="Reset north" onClick={resetNorth} />
            <StatusbarButton
                icon={terrain ? <IconMountain size={ICON_SIZE_PX} /> : <IconMountainOff size={ICON_SIZE_PX} />}
                label="Terrain"
                disabled
                onClick={toggleTerrain}
            />
            <StatusbarButton
                icon={isGlobe ? <IconWorld size={ICON_SIZE_PX} /> : <IconWorldOff size={ICON_SIZE_PX} />}
                label="Globe"
                active={isGlobe}
                disabled={!changeProjection}
                onClick={toggleProjection}
            />

            <StatusbarBadge>Sphere {version}</StatusbarBadge>
        </Statusbar>
    )
}
