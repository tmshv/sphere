import { IconPolygon, IconPoint, IconLine, IconBulb, IconBulbOff, IconFlame } from '@tabler/icons';
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ActionIcon } from '@mantine/core';
import { LayerType } from "@/types";
import { actions } from "@/store";
import { selectCurrentLayer } from "@/store/selection";
import { Outline, OutlineOnMove, OutlineRenderItem } from '@/ui/Outline';
import { useCallback } from 'react';
import { selectIsDark } from '@/store/app';
import { OutlineItem } from '@/ui/Outline/OutlineItem';
import { Icon } from './Icon';

export const LayersOutline: React.FC = () => {
    const dispatch = useAppDispatch()
    const items = useAppSelector(state => {
        const selectedLayerId = selectCurrentLayer(state)
        const dark = selectIsDark(state)

        return state.layer.allIds
            .map(id => {
                const item = state.layer.items[id]

                let bulbIconColor: string | undefined = undefined
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
    })

    const moveLayerItem = useCallback<OutlineOnMove<typeof items[0]>>((drag, hover) => {
        if (drag.index < hover.index) {
            dispatch(actions.layer.setPositionAfter({
                layerId: drag.id,
                otherLayerId: hover.id,
            }))
        } else {
            dispatch(actions.layer.setPositionBefore({
                layerId: drag.id,
                otherLayerId: hover.id,
            }))
        }
    }, [])

    const renderLayerItem = useCallback<OutlineRenderItem<typeof items[0]>>(({ id, name, type, color, visible, active, bulbIconColor }) => {
        return (
            <OutlineItem
                label={name}
                active={active}
                onClick={() => {
                    dispatch(actions.selection.selectLayer({
                        layerId: id,
                    }))
                }}
                icon={(
                    <Icon type={type} color={color} />
                )}
                extra={(
                    <ActionIcon size={"md"} radius={"sm"} h={30} onClick={() => {
                        dispatch(actions.layer.setVisible({
                            id,
                            value: !visible,
                        }))
                    }}>
                        {visible ? (
                            <IconBulb size={16} color={bulbIconColor} />
                        ) : (
                            <IconBulbOff size={16} />
                        )}
                    </ActionIcon>
                )}
            />
        )
    }, [])

    return (
        <Outline
            items={items}
            onMove={moveLayerItem}
            renderItem={renderLayerItem}
        />
    )
}
