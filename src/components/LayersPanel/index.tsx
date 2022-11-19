import { AccordionControlProps, ActionIcon, Badge, Box, Button, Flex, Select } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { IconPolygon, IconPoint, IconLine } from '@tabler/icons';
import { Accordion, useMantineTheme } from '@mantine/core';
import { LayerType } from "@/types";
import { actions } from "@/store";

const AccordionControl: React.FC<AccordionControlProps> = ({ icon, ...props }) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ActionIcon size="lg">
                {icon}
                {/* <IconDots size={16} /> */}
            </ActionIcon>
            <Accordion.Control {...props} />
        </Box>
    );
}

export const LayersPanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const layers = useAppSelector(state => state.layer.allIds.map(id => {
        const s = state.layer.items[id]

        return {
            id,
            name: s.name,
            type: s.type,
            sourceId: s.sourceId,
        }
    }))
    const theme = useMantineTheme();
    const getColor = (color: string) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7];

    return (
        <Accordion
            variant="filled"
        // chevronPosition="left"
        >
            {layers.map(({ id, sourceId, name, type }) => {
                let icon: React.ReactNode = null

                if (type === LayerType.Point) {
                    icon = (
                        <IconPoint size={20} color={getColor('blue')} />
                    )
                }
                if (type === LayerType.Line) {
                    icon = (
                        <IconLine size={20} color={getColor('blue')} />
                    )
                }
                if (type === LayerType.Polygon) {
                    icon = (
                        <IconPolygon size={20} color={getColor('blue')} />
                    )
                }

                return (
                    <Accordion.Item
                        key={id}
                        value={id}
                    >
                        <AccordionControl icon={icon}>
                            {name}
                        </AccordionControl>
                        <Accordion.Panel>
                            <Flex direction={"column"} gap={"md"} align={"flex-start"}>

                                <Badge radius={"sm"}>
                                    {type}
                                </Badge>
                                <Select
                                    label="View"
                                    placeholder="Pick one"
                                    value={type}
                                    data={[
                                        { value: LayerType.Point, label: 'Point' },
                                        { value: LayerType.Line, label: 'Line' },
                                        { value: LayerType.Polygon, label: 'Polygon' },
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
                        </Accordion.Panel>
                    </Accordion.Item>
                )
            })}
        </Accordion>
    )
}
