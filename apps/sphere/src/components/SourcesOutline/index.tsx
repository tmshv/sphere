import { actions, selectors } from "@/store"
import { Outline, type OutlineOnMove, type OutlineRenderItem, OutlineItem } from "@sphere/ui"
import { useMantineTheme } from "@mantine/core"
import { createSelector } from "@reduxjs/toolkit"
import { IconBraces } from "@tabler/icons"
import { useCallback } from "react"
import { useAppDispatch, useAppSelector } from "../../store/hooks"

const selector = createSelector(
    [selectors.source.selectSelectedId, selectors.source.items, selectors.source.allIds],
    (currentId, items, allIds) =>
        allIds.map(id => {
            const s = items[id]
            return {
                id,
                active: id === currentId,
                name: s.name,
                type: s.type,
            }
        }),
)

export const SourcesOutline: React.FC = () => {
    const theme = useMantineTheme()
    const getColor = useCallback((color: string) => theme.colors[color][theme.colorScheme === "dark" ? 5 : 7], [theme])
    const dispatch = useAppDispatch()
    const items = useAppSelector(selector)

    const moveItem = useCallback<OutlineOnMove<(typeof items)[0]>>((_drag, _hover) => {
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

    const renderItem = useCallback<OutlineRenderItem<(typeof items)[0]>>(
        ({ id, name, active }) => {
            return (
                <OutlineItem
                    label={name}
                    active={active}
                    onClick={() => {
                        dispatch(actions.source.select(id))
                    }}
                    icon={<IconBraces size={16} color={getColor("blue")} />}
                />
            )
        },
        [dispatch, getColor],
    )

    return <Outline draggable={false} items={items} onMove={moveItem} renderItem={renderItem} />
}
