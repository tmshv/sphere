import React, { useCallback } from "react";
import { MapProvider } from "react-map-gl";
import { MantineProvider } from "@mantine/core";
import { MapStatusbar } from "../MapStatusbar";
import { AppLayout } from "../../ui/AppLayout";
import { LocationToString, MapContextMenu } from "../MapContextMenu";
import { SphereMap } from "../SphereMap";
import { AppStateProvider } from "../AppStateProvider";
import { Spotlight } from "../Spotlight";

export type AppProps = {

}

export const App: React.FC<AppProps> = ({ }) => {
    const id = "spheremap"
    const copy = useCallback<LocationToString>(([lng, lat]) => `lng=${lng} lat=${lat}`, [])

    return (
        <React.StrictMode>
            <MantineProvider withGlobalStyles withNormalizeCSS theme={{
                fontFamily: "monospace",
                spacing: {
                    xs: 4,
                }
            }}>
                <AppStateProvider>
                    <Spotlight>
                        <MapProvider>
                            <AppLayout
                                footer={(
                                    <MapStatusbar
                                        id={id}
                                    />
                                )}
                            >
                                <SphereMap
                                    id={id}
                                />
                                <MapContextMenu
                                    id={id}
                                    copyLocationValue={copy}
                                />
                            </AppLayout>
                        </MapProvider>
                    </Spotlight>
                </AppStateProvider>
            </MantineProvider>
        </React.StrictMode>
    );
}
