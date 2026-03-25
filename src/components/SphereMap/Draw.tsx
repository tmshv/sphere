import { useDrawControl } from "@/hooks/useDrawControl"
import type { OnChangeDraw } from "@/hooks/useDrawControl"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { Overlay } from "@/ui/Overlay"
import { Button, Flex } from "@mantine/core"
import { useCallback, useEffect } from "react"
import { useMap } from "react-map-gl/maplibre"

export type DrawProps = {
    mapId: string
}

export default function Draw({ mapId }: DrawProps) {
    const dispatch = useAppDispatch()
    const sourceId = useAppSelector(state => state.draw.sourceId)
    const data = useAppSelector(state => {
        const sourceId = state.draw.sourceId
        if (!sourceId) {
            return null
        }
        const source = state.source.items[sourceId]
        if (!source) {
            return null
        }
        if (source.type === SourceType.FeatureCollection && !source.pending) {
            return source.dataset
        }
        return null
    })
    const onChange = useCallback<OnChangeDraw>(async (_event, _draw) => {}, [])

    const { [mapId]: ref } = useMap()
    const draw = useDrawControl({
        ref,
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
        dispatch(actions.tools.reset())
    }, [dispatch])

    const onDone = useCallback(() => {
        if (!sourceId) return
        const featureCollection = draw.getAll()
        dispatch(
            actions.draw.done({
                sourceId,
                featureCollection,
            }),
        )
        dispatch(actions.tools.reset())
    }, [dispatch, sourceId, draw])

    return (
        <Overlay
            bottom={
                <Flex gap={"xs"}>
                    <Button size="xs" color="gray" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="xs" onClick={onDone}>
                        Done
                    </Button>
                </Flex>
            }
        />
    )
}
