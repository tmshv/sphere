import { useCursor } from "@/hooks/useCursor"
import { copySelectionAsGeojson, copySelectionAsWkt } from "@/lib/copy-selection"
import { useAppSelector } from "@/store/hooks"
import { selectors } from "@/store/selectors"
import { ContextMenu } from "@sphere/ui"
import { CopyButton, Menu, Text } from "@mantine/core"
import { IconCopy, IconSearch } from "@tabler/icons"
import { useCallback, useEffect, useState } from "react"
import { useMap } from "react-map-gl/maplibre"
import type { MapLayerMouseEvent } from "react-map-gl/maplibre"

export type LocationToString = (coord: [number, number]) => string

export type MapContextMenuProps = {
    id: string
    copyLocationValue: LocationToString
}

export const MapContextMenu: React.FC<MapContextMenuProps> = ({ id, copyLocationValue }) => {
    const { [id]: ref } = useMap()
    const coord = useCursor(ref)
    const [opened, setOpened] = useState(false)
    const [position, setPosition] = useState<[number, number]>([0, 0])

    const selectionSourceId = useAppSelector(selectors.selection.sourceId)
    const selectionCount = useAppSelector(selectors.selection.count)
    const copyWrapFc = useAppSelector(selectors.settings.selectCopyWrapAsFeatureCollection)
    const copyWktSeparator = useAppSelector(selectors.settings.selectCopyWktSeparator)

    const hasSelection = selectionCount > 0 && selectionSourceId !== undefined

    useEffect(() => {
        const map = ref?.getMap()
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
    }, [ref])

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

    return (
        <ContextMenu opened={opened} position={position} onClose={handleClose}>
            <Menu.Label>Map</Menu.Label>
            {hasSelection && (
                <>
                    <Menu.Item icon={<IconCopy size={14} />} onClick={handleCopyGeojson}>
                        Copy selection as GeoJSON
                    </Menu.Item>
                    <Menu.Item icon={<IconCopy size={14} />} onClick={handleCopyWkt}>
                        Copy selection as WKT
                    </Menu.Item>
                </>
            )}
            <CopyButton value={copyLocationValue(coord)}>
                {({ copy }) => (
                    <Menu.Item icon={<IconCopy size={14} />} onClick={copy}>
                        Copy location
                    </Menu.Item>
                )}
            </CopyButton>
            <Menu.Item
                disabled
                icon={<IconSearch size={14} />}
                rightSection={
                    <Text size="xs" color="dimmed">
                        ⌘K
                    </Text>
                }
            >
                Search
            </Menu.Item>
        </ContextMenu>
    )
}
