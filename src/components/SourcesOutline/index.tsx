import { useAppDispatch, useAppSelector } from "../../store/hooks"
import { IconBraces } from "@tabler/icons"
import { useMantineTheme } from "@mantine/core"
import { actions } from "@/store"
import { selectCurrentSource } from "@/store/selection"
import { Outline, OutlineOnMove, OutlineRenderItem } from "@/ui/Outline"
import { useCallback } from "react"
import { OutlineItem } from "@/ui/Outline/OutlineItem"

export const SourcesOutline: React.FC = () => {
    const theme = useMantineTheme()
    const getColor = (color: string) => theme.colors[color][theme.colorScheme === "dark" ? 5 : 7]
    const dispatch = useAppDispatch()
    const items = useAppSelector(state => {
        const currentId = selectCurrentSource(state)
        return state.source.allIds.map(id => {
            const s = state.source.items[id]

            return {
                id,
                active: id === currentId,
                name: s.name,
                type: s.type,
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
        return (
            <OutlineItem
                label={name}
                active={active}
                onClick={() => {
                    dispatch(actions.selection.selectSource({
                        sourceId: id,
                    }))
                }}
                icon={(
                    <IconBraces size={16} color={getColor("blue")} />
                )}
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
