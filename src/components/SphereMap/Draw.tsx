import { useCallback, useEffect } from "react"
import { OnChangeDraw, useDrawControl } from "@/hooks/useDrawControl"
import { Button, Flex } from "@mantine/core"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { Overlay } from "@/ui/Overlay"
import { actions } from "@/store"

export type DrawProps = {
}

export const Draw: React.FC<DrawProps> = () => {
    const dispatch = useAppDispatch()
    const sourceId = useAppSelector(state => state.draw.sourceId)
    const data = useAppSelector(state => {
        const sourceId = state.draw.sourceId
        if (!sourceId) {
            return null
        }

        const source = state.source.items[sourceId]
        switch (source.type) {
            case SourceType.FeatureCollection: {
                return source.dataset
            }
            default: {
                return null
            }
        }
    })
    const onChange = useCallback<OnChangeDraw>(async (event, draw) => {
        // console.log(event.type, event.features)
    }, [])

    const draw = useDrawControl({
        id: "spheremap",
        onChange,
        position: "top-left",
        controls: {
            point: true,
            polygon: true,
            line_string: true,
            combine_features: true,
            uncombine_features: true,
            trash: true,
        },
        displayControlsDefault: false,
    })

    useEffect(() => {
        if (data) {
            draw.set(data)
        }
    }, [data, draw])

    const onCancel = useCallback(() => {
        dispatch(actions.draw.cancel())
    }, [])

    const onDone = useCallback(() => {
        const featureCollection = draw.getAll()
        dispatch(actions.draw.stop({
            sourceId: sourceId!,
            featureCollection,
        }))
    }, [sourceId, draw])

    return (
        <Overlay
            bottom={(
                <Flex gap={"xs"}>
                    <Button size="xs" color="gray" onClick={onCancel}>Cancel</Button>
                    <Button size="xs" onClick={onDone}>Done</Button>
                </Flex>
            )}
        />
    )
}
