import { useDrawControl } from "@/hooks/useDrawControl"
import type { OnChangeDraw } from "@/hooks/useDrawControl"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { Overlay } from "@/ui/Overlay"
import { Button, Flex } from "@mantine/core"
import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect } from "react"
import { useMap } from "react-map-gl/maplibre"

export type DrawProps = {
    mapId: string
}

export default function Draw({ mapId }: DrawProps) {
    const dispatch = useAppDispatch()
    const sourceId = useAppSelector(state => state.draw.sourceId)
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
        if (!sourceId) return
        invoke<string>("source_get", { id: sourceId })
            .then(json => draw.set(JSON.parse(json)))
            .catch(() => {})
    }, [sourceId, draw])

    const onCancel = useCallback(() => {
        dispatch(actions.tools.reset())
    }, [dispatch])

    const onDone = useCallback(async () => {
        if (!sourceId) return
        await invoke("source_replace", {
            id: sourceId,
            data: JSON.stringify(draw.getAll()),
        })
        dispatch(actions.source.bumpVersion(sourceId))
        dispatch(actions.draw.done({ sourceId }))
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
