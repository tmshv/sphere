import { actions, selectors } from "@/store"
import type { OutlineNode } from "@/store/source/outline-selectors"
import type { Id, SourceNodeKind } from "@/types"
import { ActionIcon, useMantineTheme } from "@mantine/core"
import { canMove } from "@/lib/source-tree"
import { Tree, type TreeItem, type TreeMove } from "@sphere/ui"
import { IconBraces, IconBulb, IconBulbOff, IconFolder, IconStack } from "@tabler/icons"
import { useCallback, useMemo } from "react"
import { useAppDispatch, useAppSelector } from "../../store/hooks"

export const HIDE_LABEL = "Hide"
export const SHOW_LABEL = "Show"

const ICON_SIZE = 16
const ICON_COLOR = "blue"
const ICON_SHADE_DARK = 5
const ICON_SHADE_LIGHT = 7
const BULB_HEIGHT = 30

const ICONS: Record<SourceNodeKind, typeof IconBraces> = {
    source: IconBraces,
    "source-layer": IconStack,
    folder: IconFolder,
}

type BulbProps = {
    id: Id
    visible: boolean
    onToggle: (id: Id, visible: boolean) => void
}

function Bulb({ id, visible, onToggle }: BulbProps) {
    return (
        <ActionIcon
            size={"md"}
            radius={"sm"}
            h={BULB_HEIGHT}
            aria-label={visible ? HIDE_LABEL : SHOW_LABEL}
            onClick={() => onToggle(id, !visible)}
        >
            {visible ? <IconBulb size={ICON_SIZE} /> : <IconBulbOff size={ICON_SIZE} />}
        </ActionIcon>
    )
}

export function SourcesOutline() {
    const theme = useMantineTheme()
    const iconColor = theme.colors[ICON_COLOR][theme.colorScheme === "dark" ? ICON_SHADE_DARK : ICON_SHADE_LIGHT]
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
        const toItem = ({ id, label, kind, visible, children }: OutlineNode): TreeItem => {
            const Icon = ICONS[kind]
            return {
                id,
                label,
                icon: <Icon size={ICON_SIZE} color={iconColor} />,
                extra: <Bulb id={id} visible={visible} onToggle={onVisible} />,
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
