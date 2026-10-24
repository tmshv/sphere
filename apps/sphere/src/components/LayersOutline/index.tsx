import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { IconButton, Outline, type OutlineOnMove, type OutlineRenderItem, OutlineItem } from "@sphere/ui"
import { createSelector } from "@reduxjs/toolkit"
import { IconBulb, IconBulbOff } from "@tabler/icons"
import { useCallback } from "react"
import { Icon } from "./Icon"

const HIDE_LAYER_LABEL = "Hide layer"
const SHOW_LAYER_LABEL = "Show layer"

const selectLayers = createSelector(
    [selectors.layer.selectSelectedId, selectors.app.isDark, selectors.layer.items, selectors.layer.allIds],
    (selectedLayerId, dark, items, allIds) => {
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
                    active: id === selectedLayerId,
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

export function LayersOutline() {
    const dispatch = useAppDispatch()
    const items = useAppSelector(selectLayers)

    const moveLayerItem = useCallback<OutlineOnMove<(typeof items)[0]>>(
        (drag, hover) => {
            if (drag.index < hover.index) {
                dispatch(
                    actions.layer.setPositionAfter({
                        layerId: drag.id,
                        otherLayerId: hover.id,
                    }),
                )
            } else {
                dispatch(
                    actions.layer.setPositionBefore({
                        layerId: drag.id,
                        otherLayerId: hover.id,
                    }),
                )
            }
        },
        [dispatch],
    )

    const renderLayerItem = useCallback<OutlineRenderItem<(typeof items)[0]>>(
        ({ id, name, type, color, visible, active, bulbIconColor }) => {
            return (
                <OutlineItem
                    label={name}
                    active={active}
                    onClick={() => {
                        dispatch(actions.layer.select(id))
                    }}
                    icon={<Icon type={type} color={color} />}
                    extra={
                        <IconButton
                            icon={visible ? <IconBulb size={16} color={bulbIconColor} /> : <IconBulbOff size={16} />}
                            label={visible ? HIDE_LAYER_LABEL : SHOW_LAYER_LABEL}
                            onClick={() => {
                                dispatch(
                                    actions.layer.setVisible({
                                        id,
                                        value: !visible,
                                    }),
                                )
                            }}
                        />
                    }
                />
            )
        },
        [dispatch],
    )

    return <Outline items={items} onMove={moveLayerItem} renderItem={renderLayerItem} />
}
