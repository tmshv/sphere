import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import type { Id } from "@/types"
import { Tree, type TreeItem, type TreeMove, VisibilityToggle } from "@sphere/ui"
import { createSelector } from "@reduxjs/toolkit"
import { useCallback, useMemo } from "react"
import { Icon } from "./Icon"

const NO_EXPANDED: string[] = []

const selectLayers = createSelector(
    [selectors.app.isDark, selectors.layer.items, selectors.layer.allIds],
    (dark, items, allIds) => {
        return allIds
            .map(id => {
                const item = items[id]

                let bulbIconColor: string | undefined
                if (dark && !!item.sourceId) {
                    bulbIconColor = "yellow"
                }

                return {
                    id,
                    index: item.fractionIndex,
                    name: item.name,
                    type: item.type,
                    color: item.color,
                    visible: item.visible,
                    bulbIconColor,
                }
            })
            .sort((a, b) => a.index - b.index)
    },
)

// Layers are a flat list: a layer can only go back into the list, never inside another layer
function canDropLayer(move: TreeMove): boolean {
    return move.parentId === undefined
}

export function LayersOutline() {
    const dispatch = useAppDispatch()
    const layers = useAppSelector(selectLayers)
    const selectedId = useAppSelector(selectors.layer.selectSelectedId)

    const onVisible = useCallback(
        (id: Id, value: boolean) => {
            dispatch(actions.layer.setVisible({ id, value }))
        },
        [dispatch],
    )

    const items = useMemo(
        () =>
            layers.map(
                ({ id, name, type, color, visible, bulbIconColor }): TreeItem => ({
                    id,
                    label: name,
                    icon: <Icon type={type} color={color} />,
                    extra: (
                        <VisibilityToggle
                            visible={visible}
                            color={bulbIconColor}
                            onChange={value => onVisible(id, value)}
                        />
                    ),
                }),
            ),
        [layers, onVisible],
    )

    const onSelect = useCallback(
        (id: Id | undefined) => {
            dispatch(actions.layer.select(id))
        },
        [dispatch],
    )

    const onMove = useCallback(
        ({ ids, index }: TreeMove) => {
            dispatch(actions.layer.move({ ids, index }))
        },
        [dispatch],
    )

    // A flat list has no branches to open or close
    const onToggle = useCallback(() => {}, [])

    return (
        <Tree
            items={items}
            selectedId={selectedId}
            expandedIds={NO_EXPANDED}
            onSelect={onSelect}
            onToggle={onToggle}
            onMove={onMove}
            canDrop={canDropLayer}
        />
    )
}
