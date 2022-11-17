import React, { useCallback } from "react";
import { MapProvider } from "react-map-gl";
import { MantineProvider } from "@mantine/core";
import { MapStatusbar } from "../MapStatusbar";
import { AppLayout } from "../../ui/AppLayout";
import { LocationToString, MapContextMenu } from "../MapContextMenu";
import { SphereMap } from "../SphereMap";
import { Spotlight } from "../Spotlight";
import { AppOverlay } from "../AppOverlay";
import { useAppSelector } from "../../store/hooks";
import { selectIsDark, selectIsZen } from "../../store/app";

export type AppProps = {

}

export const App: React.FC<AppProps> = ({ }) => {
    const id = "spheremap"
    const isZen = useAppSelector(selectIsZen)
    const isDark = useAppSelector(selectIsDark)

    const copy = useCallback<LocationToString>(([lng, lat]) => `lng=${lng} lat=${lat}`, [])

    return (
        <React.StrictMode>
            <MantineProvider withGlobalStyles withNormalizeCSS theme={{
                colorScheme: isDark ? "dark" : "light",
                spacing: {
                    xs: 4,
                    sm: 8,
                }
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
                        >
                            <SphereMap
                                id={id}
                            />
                            <MapContextMenu
                                id={id}
                                copyLocationValue={copy}
                            />
                            {isZen ? null : (
                                <AppOverlay />
                            )}
                        </AppLayout>
                    </Spotlight>
                </MapProvider>
            </MantineProvider>
        </React.StrictMode>
    );
}
