import { useDrawControl } from "@/hooks/useDrawControl"
import logger from "@/logger"
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
    const onChange = useCallback(async () => {}, [])

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
            .catch(err => {
                logger.error("Failed to load draw source %s: %s", sourceId, err)
            })
    }, [sourceId, draw])

    const onCancel = useCallback(() => {
        dispatch(actions.tools.reset())
    }, [dispatch])

    const onDone = useCallback(() => {
        if (!sourceId) return
        dispatch(actions.draw.commit({ sourceId, data: draw.getAll() }))
    }, [dispatch, sourceId, draw])

    return (
        <Overlay
            bottom={
                <Flex gap="xs">
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
