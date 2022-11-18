import React, { useCallback } from "react";
import { MapProvider } from "react-map-gl";
import { AccordionControlProps, ActionIcon, Badge, Box, Button, Container, Flex, List, MantineProvider, Paper, Title } from "@mantine/core";
import { MapStatusbar } from "../MapStatusbar";
import { AppLayout } from "../../ui/AppLayout";
import { LocationToString, MapContextMenu } from "../MapContextMenu";
import { SphereMap } from "../SphereMap";
import { Spotlight } from "../Spotlight";
import { AppOverlay } from "../AppOverlay";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectIsDark, selectIsZen, selectShowLeftSidebar, selectShowRightSidebar } from "../../store/app";
import { selectProperties } from "../../store/selection";
import { PropertiesViewer } from "../../ui/PropertiesViewer";
import { IconPhoto, IconPrinter, IconCameraSelfie, IconPolygon, IconPoint, IconLine, IconDots } from '@tabler/icons';
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

const Layers: React.FC = () => {
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
                            </Flex>
                        </Accordion.Panel>
                    </Accordion.Item>
                )
            })}
        </Accordion>
    )
}

export type AppProps = {

}

export const App: React.FC<AppProps> = ({ }) => {
    const id = "spheremap"
    const zen = useAppSelector(selectIsZen)
    const isDark = useAppSelector(selectIsDark)
    const left = useAppSelector(selectShowLeftSidebar)
    const right = useAppSelector(selectShowRightSidebar)
    const props = useAppSelector(selectProperties)

    const showLeft = left && !zen
    const showRight = right && !zen && !!props

    const copy = useCallback<LocationToString>(([lng, lat]) => `lng=${lng} lat=${lat}`, [])

    return (
        <React.StrictMode>
            <MantineProvider withGlobalStyles withNormalizeCSS theme={{
                colorScheme: isDark ? "dark" : "light",
                spacing: {
                    xs: 4,
                    sm: 8,
                    xl: 28, // height of Window Title
                },
                headings: {
                    sizes: {
                        h3: {
                            fontSize: 18,
                        }
                    },
                },
                activeStyles: {
                    transform: "none",
                },
            }}>
                <MapProvider>
                    <Spotlight
                        mapId={id}
                    >
                        <AppLayout
                            footer={(
                                <MapStatusbar
                                    id={id}
                                />
                            )}
                            leftSidebar={!showLeft ? null : (
                                <Paper pb={"md"} pt={"xl"} pl={"sm"} pr={"sm"} style={{
                                    width: 400,
                                    overflow: "hidden",
                                }}>
                                    <Layers />
                                </Paper>
                            )}
                            rightSidebar={!showRight ? null : (
                                <Container p={"md"} style={{
                                    minWidth: 240,
                                    overflow: "hidden",
                                }}>
                                    <Title order={3}>
                                        Properties
                                    </Title>

                                    <Paper mt={'md'}>
                                        <PropertiesViewer
                                            properties={props}
                                        />
                                    </Paper>
                                </Container>
                            )}
                        >
                            <SphereMap
                                id={id}
                            />
                            <MapContextMenu
                                id={id}
                                copyLocationValue={copy}
                            />
                            {/* {isZen ? null : (
                                <AppOverlay />
                            )} */}
                        </AppLayout>
                    </Spotlight>
                </MapProvider>
            </MantineProvider>
        </React.StrictMode>
    );
}
