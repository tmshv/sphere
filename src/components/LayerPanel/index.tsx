import { AccordionControlProps, ActionIcon, Badge, Box, Button, ColorPicker, Flex, HueSlider, Input, RangeSlider, Select, Slider, Switch, Text, TextInput } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { IconPolygon, IconPoint, IconLine, IconPhoto, IconFlame, IconPlus } from '@tabler/icons';
import { Accordion } from '@mantine/core';
import { LayerType } from "@/types";
import { actions } from "@/store";

export const LayerPanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const sources = useAppSelector(state => state.source.allIds.map(id => ({
        value: id,
        label: state.source.items[id].name,
        type: state.source.items[id].type,
    })))
    const layer = useAppSelector(state => {
        const { layerId } = state.selection
        if (!layerId) {
            return null
        }

        const s = state.layer.items[layerId]

        return {
            id: layerId,
            name: s.name,
            type: s.type,
            visible: s.visible,
            sourceId: s.sourceId,
            color: s.color,
            circleRange: [s.circle?.minRadius ?? 2, s.circle?.maxRadius ?? 6] as [number, number],
            heatmapRadius: s.heatmap?.radius ?? 10,
        }
    })

    if (!layer) {
        return null
    }
    const { id, sourceId, visible, name, type, color, circleRange, heatmapRadius } = layer

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
            <TextInput
                size="xs"
                label="Name"
                value={name}
                onChange={event => {
                    const value = event.target.value
                    dispatch(actions.layer.setName({
                        id,
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
                onChange={value => {
                    if (value) {
                        dispatch(actions.layer.setSource({
                            id,
                            sourceId: value,
                        }))
                    }
                }}
            />

            <Select
                size="xs"
                label="View"
                placeholder="Pick one"
                value={type}
                data={[
                    { value: LayerType.Point, label: 'Points' },
                    { value: LayerType.Line, label: 'Lines' },
                    { value: LayerType.Polygon, label: 'Polygons' },
                    { value: LayerType.Photo, label: 'Photos' },
                    { value: LayerType.Heatmap, label: 'Heatmap' },
                ]}
                onChange={value => {
                    if (value) {
                        dispatch(actions.layer.setType({
                            id,
                            type: value as LayerType
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
                        dispatch(actions.layer.setColor({ id, color }))
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
                                id,
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
                                id,
                                value,
                            }))
                        }}
                    />
                </Input.Wrapper>
            )}
        </Flex>
    )
}
