import { writeText } from '@tauri-apps/api/clipboard';
import { SpotlightProvider } from '@mantine/spotlight';
import { IconHome, IconSearch, IconCopy, IconZoomReset } from '@tabler/icons';
import { useContext } from 'react';
import { useMap } from 'react-map-gl';
import { AppStateContext } from '../../state';

export type SpotlightProps = {
    mapId: string
    children: React.ReactNode
}

export const Spotlight: React.FC<SpotlightProps> = ({ children, mapId }) => {
    const { [mapId]: ref } = useMap()
    const state = useContext(AppStateContext);

    return (
        <SpotlightProvider
            actions={[
                {
                    title: 'Toggle Map',
                    description: 'Toggle to Vector or Satellite map',
                    onTrigger: () => {
                        state.mapStyle.send("TOGGLE")
                    },
                    icon: <IconHome size={18} />,
                },
                {
                    title: 'Copy viewport',
                    description: 'Copy current viewport state as JSON',
                    onTrigger: async () => {
                        const map = ref?.getMap()
                        if (!map) {
                            return
                        }
                        
                        const center = map.getCenter()
                        const zoom = map.getZoom()
                        const pitch = map.getPitch()
                        const bearing = map.getBearing()
                        const maxPitch = map.getMaxPitch()
                        const payload = {
                            center,
                            zoom,
                            pitch,
                            bearing,
                            maxPitch,
                        }
                        const data = JSON.stringify(payload, null, 4)

                        await writeText(data);
                    },
                    icon: <IconCopy size={18} />,
                },
                {
                    title: 'Reset rotation',
                    description: 'Set pitch and bearing to 0',
                    onTrigger: async () => {
                        const map = ref?.getMap()
                        if (!map) {
                            return
                        }

                        map.setBearing(0)
                        map.setPitch(0)
                    },
                    icon: <IconZoomReset size={18} />,
                },
            ]}
            searchIcon={<IconSearch size={18} />}
            searchPlaceholder="Search..."
            shortcut="mod + p"
            nothingFoundMessage="Nothing found..."
        >
            {children}
        </SpotlightProvider>
    );
}
