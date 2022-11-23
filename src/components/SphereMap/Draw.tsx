import { useCallback, useEffect, useState } from "react"
import { OnChangeDraw, useDrawControl } from "@/hooks/useDrawControl"
// import { dataToGeojson } from "./lib"
import { Box, Button, Center, createStyles, Group } from "@mantine/core"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { Overlay } from "@/ui/Overlay"
import { actions } from "@/store"

const useStyles = createStyles(theme => ({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        marginLeft: "auto",
        marginRight: "auto",
        padding: theme.spacing.sm,
        pointerEvents: "none",
    },
    toolbar: {
        pointerEvents: "auto",
    },
}))

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
    const currentType = "point"
    // const [currentType, setCurrentType] = useState<string | null>(null)
    // const { classes: s } = useStyles()
    // const { data: features } = useSWR<EditFeatureDto[]>(`/api/edit/projects/${projectId}/features`)

    const onChange = useCallback<OnChangeDraw>(async (event, draw) => {
        // const feature = event.features[0]
        // const featureId = feature.id! as string
        // const ids = event.features.map(x => x.id) as string[]

        console.log(event.type, event.features)
        // switch (event.type) {

        // case "draw.create": {
        //     const payload = {
        //         geometry: feature.geometry,
        //         type: currentType ?? FeatureType.Unknown,
        //     }
        //     fetch(`/api/edit/projects/${projectId}/features/create`, {
        //         method: "POST",
        //         headers: {
        //             "content-type": "application/json",
        //         },
        //         body: JSON.stringify(payload),
        //     })
        //         .then(async res => {
        //             if (res.ok && res.status == 200) {
        //                 return await res.json()
        //             } else {
        //                 throw Error(res.statusText)
        //             }
        //         })
        //         .then(() => {
        //             mutate(`/api/edit/projects/${projectId}/features`)
        //         })
        //         .catch(e => {
        //             // eslint-disable-next-line no-console
        //             console.log("API error: ", e)
        //             draw.delete(ids)
        //         })
        //     break
        // }

        // case "draw.update": {
        //     const payload = {
        //         geometry: feature.geometry,
        //     }
        //     fetch(`/api/edit/features/${featureId}/update-geometry`, {
        //         method: "PUT",
        //         headers: {
        //             "content-type": "application/json",
        //         },
        //         body: JSON.stringify(payload),
        //     })
        //     break
        // }

        // case "draw.delete": {
        //     fetch(`/api/edit/features/${featureId}/delete`, {
        //         method: "DELETE",
        //     })
        //         .then(() => {
        //             mutate(`/api/edit/projects/${projectId}/features`)
        //         })
        //     break
        // }

        // default: {
        //     // eslint-disable-next-line no-console
        //     console.log(event.type, event.features)
        //     break
        // }
        // }
    }, [currentType])

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
                <Group>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button onClick={onDone}>Done</Button>
                </Group>
            )}
        />
    )
}
