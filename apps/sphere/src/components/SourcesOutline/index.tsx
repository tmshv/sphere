import { actions, selectors } from "@/store"
import type { OutlineNode } from "@/store/source/outline-selectors"
import type { Id, SourceKind } from "@/types"
import { canMove } from "@/lib/source-tree"
import { Tree, type TreeItem, type TreeMove, useAccentColor, VisibilityToggle } from "@sphere/ui"
import {
    IconBraces,
    IconFileUnknown,
    IconFolder,
    IconPhoto,
    IconPolygon,
    IconRoute,
    IconStack2,
    IconTable,
    IconVector,
    IconWorld,
} from "@tabler/icons-react"
import { useCallback, useMemo } from "react"
import { useAppDispatch, useAppSelector } from "../../store/hooks"

const ICON_SIZE = 16

const ICONS: Record<SourceKind, typeof IconBraces> = {
    geojson: IconBraces,
    csv: IconTable,
    shapefile: IconPolygon,
    gpx: IconRoute,
    kml: IconWorld,
    "vector-tiles": IconStack2,
    "raster-tiles": IconPhoto,
    "source-layer": IconVector,
    folder: IconFolder,
}

function iconOf(kind: SourceKind | null) {
    return kind ? ICONS[kind] : IconFileUnknown
}

export function SourcesOutline() {
    const iconColor = useAccentColor()
    const dispatch = useAppDispatch()
    const outline = useAppSelector(selectors.source.selectSourceOutline)
    const tree = useAppSelector(selectors.source.selectSourceTreeShape)
    const selectedId = useAppSelector(selectors.source.selectSelectedId)
    const expandedIds = useAppSelector(selectors.source.expandedIds)

    const onVisible = useCallback(
        (id: Id, value: boolean) => {
            dispatch(actions.source.setVisible({ id, value }))
        },
        [dispatch],
    )

    const items = useMemo(() => {
        const toItem = ({ id, label, sourceKind, visible, children }: OutlineNode): TreeItem => {
            const Icon = iconOf(sourceKind)
            return {
                id,
                label,
                icon: <Icon size={ICON_SIZE} color={iconColor} />,
                extra: <VisibilityToggle visible={visible} onChange={value => onVisible(id, value)} />,
                children: children.map(toItem),
            }
        }
        return outline.map(toItem)
    }, [outline, iconColor, onVisible])

    const onSelect = useCallback(
        (id: Id | undefined) => {
            dispatch(actions.source.select(id))
        },
        [dispatch],
    )

    const onToggle = useCallback(
        (id: Id, value: boolean) => {
            dispatch(actions.source.setExpanded({ id, value }))
        },
        [dispatch],
    )

    const onMove = useCallback(
        (move: TreeMove) => {
            dispatch(actions.source.move(move))
        },
        [dispatch],
    )

    const canDrop = useCallback(
        (move: TreeMove) => canMove(tree.nodes, tree.rootIds, move.ids, move.parentId, move.index),
        [tree],
    )

    return (
        <Tree
            items={items}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggle={onToggle}
            onMove={onMove}
            canDrop={canDrop}
        />
    )
}
