import { Badge, ColorPicker, Flex, Input, Select, Slider, TextInput } from "@mantine/core"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { IconPolygon, IconPoint, IconLine, IconPhoto, IconFlame, IconCrosshair, IconTrash, IconCopy } from "@tabler/icons"
import { LayerType, SourceType } from "@/types"
import { actions } from "@/store"
import { ActionBar } from "@/ui/ActionBar"
import { PhotoIconLayout } from "@/store/layer"

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
        let fields: string[] | undefined
        if (sourceId) {
            const source = state.source.items[sourceId]
            switch (source.type) {
                case SourceType.MVT: {
                    sourceLayers = source.sourceLayers.map(({ id, name }) => ({
                        value: id,
                        label: id,
                    }))
                    const vl = source.tilejson.vector_layers.find(x => x.id === s.sourceLayer)
                    if (vl) {
                        fields = Object.keys(vl.fields)
                    }
                    break
                }
                case SourceType.Geojson: {
                    fields = Object.keys(source.metadata)
                    break
                }
                default: {
                    break
                }
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
            srcField: s.photo?.srcField,
            valueField: s.photo?.valueField,
            fields: fields ?? [],
            color: s.color,
            circleRange: [s.circle?.minRadius ?? 2, s.circle?.maxRadius ?? 6] as [number, number],
            heatmapRadius: s.heatmap?.radius ?? 10,
            icon: s.photo?.icon,
        }
    })

    if (!layer) {
        return null
    }
    const { id: layerId, sourceId, sourceLayer, sourceLayers, name, type, color, circleRange, heatmapRadius } = layer

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
    if (type === LayerType.Raster) {
        icon = (
            <IconPhoto size={20} color={color} />
        )
    }
    if (type === LayerType.Heatmap) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                            break
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
                    if (!sourceId) {
                        return
                    }
                    dispatch(actions.layer.setSource({
                        id: layerId,
                        sourceId,
                    }))
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
                        if (!value) {
                            return
                        }
                        dispatch(actions.layer.setSource({
                            id: layerId,
                            sourceId: sourceId!,
                            sourceLayer: value,
                        }))
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
                    { value: LayerType.Raster, label: "Raster" },
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

            {!(type === LayerType.Point || type === LayerType.Line || type === LayerType.Polygon) ? null : (
                <>
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
                </>
            )}

            {!(type === LayerType.Point) ? null : (
                <>
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
                </>
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

            {!(type === LayerType.Photo) ? null : (
                <>
                    <Select
                        size="xs"
                        label="Image field"
                        placeholder="Pick one"
                        value={layer.srcField}
                        data={layer.fields}
                        onChange={src => {
                            if (src) {
                                dispatch(actions.layer.setPhotoField({
                                    id: layerId,
                                    src,
                                }))
                            }
                        }}
                    />
                    <Select
                        size="xs"
                        label="Value field"
                        placeholder="Pick one"
                        value={layer.valueField}
                        data={layer.fields}
                        onChange={value => {
                            if (value) {
                                dispatch(actions.layer.setPhotoField({
                                    id: layerId,
                                    value,
                                }))
                            }
                        }}
                    />
                    <Select
                        size="xs"
                        label="Layout"
                        placeholder="Pick one"
                        value={layer.icon}
                        data={[
                            { value: "square", label: "Square" },
                            { value: "circle", label: "Circle" },
                        ]}
                        onChange={(value: PhotoIconLayout) => {
                            if (value) {
                                dispatch(actions.layer.setPhotoIconLayout({
                                    id: layerId,
                                    value,
                                }))
                            }
                        }}
                    />
                </>
            )}
        </Flex>
    )
}
