import React, { useCallback } from "react";
import { MapProvider } from "react-map-gl";
import { Container, Flex, MantineProvider, Paper, Title, useMantineTheme } from "@mantine/core";
import { MapStatusbar } from "../MapStatusbar";
import { AppLayout } from "../../ui/AppLayout";
import { LocationToString, MapContextMenu } from "../MapContextMenu";
import { SphereMap } from "../SphereMap";
import { Spotlight } from "../Spotlight";
import { useAppSelector } from "../../store/hooks";
import { selectIsDark, selectIsZen, selectShowLeftSidebar, selectShowRightSidebar } from "../../store/app";
import { selectProperties } from "../../store/selection";
import { PropertiesViewer } from "../../ui/PropertiesViewer";
import { Overlay } from "@/ui/Overlay";
import { Toolbar } from "@/ui/Toolbar";
import { SourcePanel } from "../SourcePanel";
import { Left, StyledTabs } from "./left";

export type AppProps = {

}

export const App: React.FC<AppProps> = ({ }) => {
    const theme = useMantineTheme()
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
                    sm: 6,
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
                primaryColor: 'blue',
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
                                <Flex pt={"xl"} p={0}
                                    style={{
                                        borderRight: `1px solid ${theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[3]}`,
                                    }}
                                // style={{
                                //     borderRight: `1px solid #343a40`,
                                // }}
                                >
                                    <Left />
                                    {/* <Paper pl={"sm"} pr={"sm"} style={{
                                        width: 400,
                                        overflow: "hidden",
                                    }}>
                                        <SourcePanel />
                                    </Paper> */}
                                </Flex>
                            )}
                            rightSidebar={!showRight ? null : (
                                <Container pt={"lg"} style={{
                                    minWidth: 240,
                                    overflow: "hidden",
                                }}>
                                    <Title order={3}>
                                        Properties
                                    </Title>

                                    <Paper mt={'sm'}>
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
                            {zen ? null : (
                                <Overlay
                                    // top={(
                                    //     <Toolbar horizontal></Toolbar>
                                    // )}
                                    right={(
                                        <Toolbar></Toolbar>
                                        // <Paper pl={"sm"} pr={"sm"} style={{
                                        //     width: 400,
                                        //     overflow: "hidden",
                                        // }}>
                                        //     <SourcePanel />
                                        // </Paper>
                                    )}
                                />
                            )}
                        </AppLayout>
                    </Spotlight>
                </MapProvider>
            </MantineProvider>
        </React.StrictMode>
    );
}
