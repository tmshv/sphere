import React, { useCallback } from "react";
import { MapProvider } from "react-map-gl";
import { MantineProvider } from "@mantine/core";
import { Provider } from "react-redux";
import { MapStatusbar } from "../MapStatusbar";
import { AppLayout } from "../../ui/AppLayout";
import { LocationToString, MapContextMenu } from "../MapContextMenu";
import { SphereMap } from "../SphereMap";
import { AppStateProvider } from "../AppStateProvider";
import { Spotlight } from "../Spotlight";
import { useFileDrop } from "../../hooks/useFileDrop";
import { store } from "../../store";

export type AppProps = {

}

export const App: React.FC<AppProps> = ({ }) => {
    const id = "spheremap"
    const copy = useCallback<LocationToString>(([lng, lat]) => `lng=${lng} lat=${lat}`, [])
    const data = useFileDrop()

    return (
        <React.StrictMode>
            <MantineProvider withGlobalStyles withNormalizeCSS theme={{
                spacing: {
                    xs: 4,
                    sm: 8,
                }
            }}>
                <Provider store={store}>
                    <AppStateProvider>
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
                                >
                                    <SphereMap
                                        id={id}
                                        data={data}
                                    />
                                    <MapContextMenu
                                        id={id}
                                        copyLocationValue={copy}
                                    />
                                </AppLayout>
                            </Spotlight>
                        </MapProvider>
                    </AppStateProvider>
                </Provider>
            </MantineProvider>
        </React.StrictMode>
    );
}
