import { Badge, ColorPicker, Flex, Input, Select, Slider, TextInput } from "@mantine/core"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { IconPolygon, IconPoint, IconLine, IconPhoto, IconFlame, IconCrosshair, IconTrash, IconCopy } from "@tabler/icons"
import { LayerType, SourceType } from "@/types"
import { actions } from "@/store"
import { ActionBar } from "@/ui/ActionBar"

type Option = {
    value: string
    label: string
}

export const LayerPanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const sources = useAppSelector(state => {
        return state.source.allIds.reduce((acc, id) => {
            const source = state.source.items[id]
            if (!source.pending) {
                acc.push({
                    value: id,
                    label: state.source.items[id].name,
                    type: state.source.items[id].type,
                })
            }
            return acc
        }, [] as Array<Option & { type: SourceType }>)
    })

    const layer = useAppSelector(state => {
        const { layerId } = state.selection
        if (!layerId) {
            return null
        }

        const s = state.layer.items[layerId]

        const sourceId = s.sourceId
        let sourceLayers: Option[] | undefined
        if (sourceId) {
            const source = state.source.items[sourceId]
            if (source.type === SourceType.MVT) {
                sourceLayers = source.sourceLayers.map(({ id, name }) => ({
                    value: id,
                    label: id,
                }))
            }
        }

        return {
            id: layerId,
            name: s.name,
            type: s.type,
            visible: s.visible,
            sourceId: s.sourceId,
            sourceLayer: s.sourceLayer,
            sourceLayers,
            color: s.color,
            circleRange: [s.circle?.minRadius ?? 2, s.circle?.maxRadius ?? 6] as [number, number],
            heatmapRadius: s.heatmap?.radius ?? 10,
        }
    })
    if (!layer) {
        return null
    }
    console.log(layer)
    const { id: layerId, sourceId, sourceLayer, sourceLayers, visible, name, type, color, circleRange, heatmapRadius } = layer

    let icon: React.ReactNode = null

    if (type === LayerType.Point) {
        icon = (
            <IconPoint size={20} color={color} />
        )
    }
    if (type === LayerType.Line) {
        icon = (
            <IconLine size={20} color={color} />
        )
    }
    if (type === LayerType.Polygon) {
        icon = (
            <IconPolygon size={20} color={color} />
        )
    }
    if (type === LayerType.Photo) {
        icon = (
            <IconPhoto size={20} color={color} />
        )
    }
    if (type === LayerType.Heatmap) {
        icon = (
            <IconFlame size={20} color={color} />
        )
    }

    return (
        <Flex direction={"column"} gap={"md"} align={"stretch"} mb={"sm"}>
            <ActionBar
                tooltipPosition={"top"}
                onClick={name => {
                    switch (name) {
                        case "trash": {
                            dispatch(actions.layer.removeLayer(layerId!))
                            break
                        }
                        case "zoom": {
                            dispatch(actions.source.zoomTo(sourceId!))
                            break
                        }
                        case "duplicate": {
                            dispatch(actions.layer.duplicate(layerId))
                            break
                        }
                        default: {
                        }
                    }
                }}
                items={[
                    {
                        name: "trash",
                        label: "Delete layer",
                        disabled: !layerId,
                        icon: IconTrash,
                        color: "red",
                    },
                    null,
                    {
                        name: "duplicate",
                        label: "Duplicate layer",
                        icon: IconCopy,
                    },
                    {
                        name: "zoom",
                        label: "Zoom to layer",
                        disabled: !sourceId,
                        icon: IconCrosshair,
                    },
                ]}
            />
            <TextInput
                size="xs"
                label="Name"
                value={name}
                onChange={event => {
                    const value = event.target.value
                    dispatch(actions.layer.setName({
                        id: layerId,
                        value,
                    }))
                }}
            />

            <Select
                size="xs"
                label="Source"
                placeholder="Pick one"
                value={sourceId}
                data={sources}
                onChange={sourceId => {
                    if (sourceId) {
                        dispatch(actions.layer.setSource({
                            id: layerId,
                            sourceId,
                        }))
                    }
                }}
            />

            {!sourceLayers ? null : (
                <Select
                    size="xs"
                    label="Source layer"
                    placeholder="Pick one"
                    value={sourceLayer}
                    data={sourceLayers}
                    onChange={value => {
                        if (value) {
                            dispatch(actions.layer.setSource({
                                id: layerId,
                                sourceId: sourceId!,
                                sourceLayer: value,
                            }))
                        }
                    }}
                />
            )}

            <Select
                size="xs"
                label="View"
                placeholder="Pick one"
                value={type}
                data={[
                    { value: LayerType.Point, label: "Points" },
                    { value: LayerType.Line, label: "Lines" },
                    { value: LayerType.Polygon, label: "Polygons" },
                    { value: LayerType.Photo, label: "Photos" },
                    { value: LayerType.Heatmap, label: "Heatmap" },
                ]}
                onChange={value => {
                    if (value) {
                        dispatch(actions.layer.setType({
                            id: layerId,
                            type: value as LayerType,
                        }))
                    }
                }}
            />

            <Input.Wrapper label={(
                <>
                    Color
                    <Badge ml={"xs"} size="xs" radius={"sm"}>{color}</Badge>
                </>
            )} size="xs">
                <ColorPicker
                    format="hex"
                    size="xs"
                    value={color}
                    styles={theme => ({
                        wrapper: {
                            width: "100%",
                        },
                        saturation: {
                            height: 130,
                        },
                        slider: {
                            marginTop: theme.spacing.sm,
                        },
                    })}
                    onChange={color => {
                        dispatch(actions.layer.setColor({ id: layerId, color }))
                    }}
                />
            </Input.Wrapper>

            {!(type === LayerType.Point) ? null : (
                <Input.Wrapper label="Radius" size="xs">
                    <Slider
                        size={"xs"}
                        min={1}
                        max={4}
                        value={circleRange[1]}
                        onChange={max => {
                            dispatch(actions.layer.setCircleRadius({
                                id: layerId,
                                min: 0,
                                max,
                            }))
                        }}
                    />
                </Input.Wrapper>
            )}

            {!(type === LayerType.Heatmap) ? null : (
                <Input.Wrapper label="Radius" size="xs">
                    <Slider
                        label={"Radius"}
                        size={"xs"}
                        min={2}
                        max={30}
                        value={heatmapRadius}
                        onChange={value => {
                            dispatch(actions.layer.setHeatmapRadius({
                                id: layerId,
                                value,
                            }))
                        }}
                    />
                </Input.Wrapper>
            )}
        </Flex>
    )
}
