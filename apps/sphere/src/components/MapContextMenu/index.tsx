import { useCursor } from "@/hooks/useCursor"
import { copySelectionAsGeojson, copySelectionAsWkt } from "@/lib/copy-selection"
import { useAppSelector } from "@/store/hooks"
import { selectors } from "@/store/selectors"
import logger from "@/logger"
import { ContextMenu, ContextMenuItem, ContextMenuLabel } from "@sphere/ui"
import { IconCopy, IconSearch } from "@tabler/icons"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { useCallback, useEffect, useState } from "react"
import { useMap } from "react-map-gl/maplibre"
import type { MapLayerMouseEvent } from "react-map-gl/maplibre"

export type LocationToString = (coord: [number, number]) => string

export type MapContextMenuProps = {
    id: string
    copyLocationValue: LocationToString
}

const ICON_SIZE = 14
const SEARCH_SHORTCUT = "⌘K"

export function MapContextMenu({ id, copyLocationValue }: MapContextMenuProps) {
    const { [id]: ref } = useMap()
    const map = ref?.getMap() ?? null
    const coord = useCursor(ref)
    const [opened, setOpened] = useState(false)
    const [position, setPosition] = useState<[number, number]>([0, 0])

    const selectionSourceId = useAppSelector(selectors.selection.sourceId)
    const selectionCount = useAppSelector(selectors.selection.count)
    const copyWrapFc = useAppSelector(selectors.settings.selectCopyWrapAsFeatureCollection)
    const copyWktSeparator = useAppSelector(selectors.settings.selectCopyWktSeparator)

    const hasSelection = selectionCount > 0 && selectionSourceId !== undefined

    useEffect(() => {
        if (!map) return

        const handler = (e: MapLayerMouseEvent) => {
            e.preventDefault()
            const rect = map.getContainer().getBoundingClientRect()
            setPosition([e.point.x + rect.left, e.point.y + rect.top])
            setOpened(true)
        }

        map.on("contextmenu", handler)
        return () => {
            map.off("contextmenu", handler)
        }
    }, [map])

    const handleClose = useCallback(() => {
        setOpened(false)
    }, [])

    const handleCopyGeojson = useCallback(async () => {
        if (selectionSourceId === undefined) return
        await copySelectionAsGeojson(selectionSourceId, copyWrapFc)
        setOpened(false)
    }, [selectionSourceId, copyWrapFc])

    const handleCopyWkt = useCallback(async () => {
        if (selectionSourceId === undefined) return
        await copySelectionAsWkt(selectionSourceId, copyWktSeparator)
        setOpened(false)
    }, [selectionSourceId, copyWktSeparator])

    const onCopyGeojson = useCallback(() => {
        handleCopyGeojson().catch(err => {
            logger.error("Failed to copy selection as GeoJSON: %s", err)
        })
    }, [handleCopyGeojson])

    const onCopyWkt = useCallback(() => {
        handleCopyWkt().catch(err => {
            logger.error("Failed to copy selection as WKT: %s", err)
        })
    }, [handleCopyWkt])

    const onCopyLocation = useCallback(() => {
        writeText(copyLocationValue(coord)).catch(err => {
            logger.error("Failed to copy location: %s", err)
        })
    }, [copyLocationValue, coord])

    return (
        <ContextMenu opened={opened} position={position} onClose={handleClose}>
            <ContextMenuLabel>Map</ContextMenuLabel>
            {hasSelection && (
                <>
                    <ContextMenuItem icon={<IconCopy size={ICON_SIZE} />} onClick={onCopyGeojson}>
                        Copy selection as GeoJSON
                    </ContextMenuItem>
                    <ContextMenuItem icon={<IconCopy size={ICON_SIZE} />} onClick={onCopyWkt}>
                        Copy selection as WKT
                    </ContextMenuItem>
                </>
            )}
            <ContextMenuItem icon={<IconCopy size={ICON_SIZE} />} onClick={onCopyLocation}>
                Copy location
            </ContextMenuItem>
            <ContextMenuItem disabled icon={<IconSearch size={ICON_SIZE} />} shortcut={SEARCH_SHORTCUT}>
                Search
            </ContextMenuItem>
        </ContextMenu>
    )
}
