import { AccordionControlProps, ActionIcon, Badge, Box, Button, ColorPicker, Flex, HueSlider, RangeSlider, Select, Slider, Switch, Text } from "@mantine/core";
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
        <Flex direction={"column"} gap={"md"} align={"flex-start"}>
            <Switch
                checked={visible}
                onChange={(event) => {
                    dispatch(actions.layer.setVisible({
                        id,
                        value: event.currentTarget.checked,
                    }))
                }}
            />

            <Badge radius={"sm"}>
                {type}
            </Badge>
            <Select
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
            <Flex direction={"column"} align={"stretch"} gap={"md"}>
                <ColorPicker
                    format="hex"
                    size="sm"
                    value={color}
                    onChange={color => {
                        dispatch(actions.layer.setColor({ id, color }))
                    }}
                />
                <Text>{color}</Text>

                {!(type === LayerType.Point) ? null : (
                    <Slider
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
                    // <RangeSlider
                    //     thumbSize={14}
                    //     mt="xl"
                    //     defaultValue={circleRange}
                    //     onChange={([min, max]) => {
                    //         console.log(min, max)
                    //         dispatch(actions.layer.setCircleRadius({
                    //             id,
                    //             min,
                    //             max,
                    //         }))
                    //     }}
                    // />
                )}

                {!(type === LayerType.Heatmap) ? null : (
                    <Slider
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
                )}

                <Button
                    size="sm"
                    color={"red"}
                    onClick={() => {
                        dispatch(actions.layer.removeLayer(id))
                    }}
                >Delete</Button>
                <Button
                    size="sm"
                    disabled={!sourceId}
                    onClick={() => {
                        if (!sourceId) {
                            return
                        }
                        dispatch(actions.source.zoomTo(sourceId))
                    }}
                >Zoom</Button>
            </Flex>
        </Flex>
    )
}