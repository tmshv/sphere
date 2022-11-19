import { AccordionControlProps, ActionIcon, Badge, Box, Button, Flex } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { IconPolygon, IconPoint, IconLine } from '@tabler/icons';
import { Accordion, useMantineTheme } from '@mantine/core';
import { SourceType } from "../../types";
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

export const SourcePanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const sources = useAppSelector(state => state.source.allIds.map(id => {
        const s = state.source.items[id]

        return {
            id,
            name: s.name,
            type: s.type,
        }
    }))
    const theme = useMantineTheme();
    const getColor = (color: string) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7];

    return (
        <Accordion
            variant="filled"
        // chevronPosition="left"
        >
            {sources.map(source => {
                let icon: React.ReactNode = null

                if (source.type === SourceType.Points) {
                    icon = (
                        <IconPoint size={20} color={getColor('blue')} />
                    )
                }
                if (source.type === SourceType.Lines) {
                    icon = (
                        <IconLine size={20} color={getColor('blue')} />
                    )
                }
                if (source.type === SourceType.Polygons) {
                    icon = (
                        <IconPolygon size={20} color={getColor('blue')} />
                    )
                }

                return (
                    <Accordion.Item
                        value={source.id}
                        key={source.id}
                    >
                        <AccordionControl icon={icon}>
                            {source.name}
                        </AccordionControl>
                        <Accordion.Panel>
                            <Flex direction={"column"} gap={"md"} align={"flex-start"}>
                                <Badge radius={"sm"}>
                                    {source.type}
                                </Badge>
                                {/* <PropertiesViewer
                                properties={[
                                    {
                                        key: "Area",
                                        value: 2341,
                                    }
                                ]}
                            /> */}
                                <Button
                                    size="sm"
                                    color={"red"}
                                    onClick={() => {
                                        dispatch(actions.source.removeSource(source.id))
                                    }}
                                >Delete</Button>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        dispatch(actions.source.zoomTo(source.id))
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
