import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { IconPolygon, IconPoint, IconLine, IconFile, IconBraces } from '@tabler/icons';
import { Box, NavLink, useMantineTheme } from '@mantine/core';
import { SourceType } from "../../types";
import { actions } from "@/store";
import { selectCurrentSource } from "@/store/selection";
import { Outline, OutlineOnMove, OutlineRenderItem } from "@/ui/Outline";
import { useCallback } from "react";
import { OutlineItem } from "@/ui/Outline/OutlineItem";
// import { NavbarLink, SideMenu } from "@/ui/SideMenu";

export const SourcesOutline: React.FC = () => {
    const theme = useMantineTheme();
    const getColor = (color: string) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7];
    const dispatch = useAppDispatch()
    const items = useAppSelector(state => {
        const currentId = selectCurrentSource(state)
        return state.source.allIds.map(id => {
            const s = state.source.items[id]

            return {
                id,
                active: id === currentId,
                name: s.name,
                type: s.dataset.type,
            }
        })
    })

    const moveItem = useCallback<OutlineOnMove<typeof items[0]>>((drag, hover) => {
        // if (drag.index < hover.index) {
        //     dispatch(actions.layer.setPositionAfter({
        //         layerId: drag.id,
        //         otherLayerId: hover.id,
        //     }))
        // } else {
        //     dispatch(actions.layer.setPositionBefore({
        //         layerId: drag.id,
        //         otherLayerId: hover.id,
        //     }))
        // }
    }, [])

    const renderItem = useCallback<OutlineRenderItem<typeof items[0]>>(({ id, name, type, active }) => {
        let icon: React.ReactNode = null
        if (type === SourceType.Points) {
            icon = (
                <IconPoint size={16} color={getColor('blue')} />
            )
        } else if (type === SourceType.Lines) {
            icon = (
                <IconLine size={16} color={getColor('blue')} />
            )
        } else if (type === SourceType.Polygons) {
            icon = (
                <IconPolygon size={16} color={getColor('blue')} />
            )
        } else {
            icon = (
                <IconBraces size={16} color={getColor('blue')} />
            )
        }

        return (
            <OutlineItem
                label={name}
                active={active}
                onClick={() => {
                    dispatch(actions.selection.selectSource({
                        sourceId: id,
                    }))
                }}
                icon={icon}
            />
        )
    }, [])

    return (
        <Outline
            draggable={false}
            items={items}
            onMove={moveItem}
            renderItem={renderItem}
        />
    )
}
