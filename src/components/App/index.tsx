import React, { useCallback } from "react";
import { MapProvider } from "react-map-gl";
import { MantineProvider } from "@mantine/core";
import { SpotlightProvider } from '@mantine/spotlight';
import type { SpotlightAction } from '@mantine/spotlight';
import { IconHome, IconDashboard, IconFileText, IconSearch } from '@tabler/icons';
import { MapStatusbar } from "../MapStatusbar";
import { AppLayout } from "../../ui/AppLayout";
import { LocationToString, MapContextMenu } from "../MapContextMenu";
import { SphereMap } from "../SphereMap";

const actions: SpotlightAction[] = [
    {
        title: 'Home',
        description: 'Get to home page',
        onTrigger: () => console.log('Home'),
        icon: <IconHome size={18} />,
    },
    {
        title: 'Dashboard',
        description: 'Get full information about current system status',
        onTrigger: () => console.log('Dashboard'),
        icon: <IconDashboard size={18} />,
    },
    {
        title: 'Documentation',
        description: 'Visit documentation to lean more about all features',
        onTrigger: () => console.log('Documentation'),
        icon: <IconFileText size={18} />,
    },
];

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
                <SpotlightProvider
                    actions={actions}
                    searchIcon={<IconSearch size={18} />}
                    searchPlaceholder="Search..."
                    shortcut="mod + p"
                    nothingFoundMessage="Nothing found..."
                    disabled
                >
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
                </SpotlightProvider>
            </MantineProvider>
        </React.StrictMode>
    );
}
