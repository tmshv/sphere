import { writeText } from '@tauri-apps/api/clipboard';
import { SpotlightProvider } from '@mantine/spotlight';
import { IconSearch, IconCopy, IconZoomReset } from '@tabler/icons';
import { useMap } from 'react-map-gl';
import { useAppDispatch } from '../../store/hooks';
import { actions } from '../../store';

export type SpotlightProps = {
    mapId: string
    children: React.ReactNode
}

export const Spotlight: React.FC<SpotlightProps> = ({ children, mapId }) => {
    const { [mapId]: ref } = useMap()
    const dispatch = useAppDispatch()

    return (
        <SpotlightProvider
            actions={[
                {
                    title: 'Vector',
                    description: 'Set vector map style',
                    onTrigger: () => {
                        dispatch(actions.mapStyle.setVector())
                    },
                },
                {
                    title: 'Satellite',
                    description: 'Set satellite map style',
                    onTrigger: () => {
                        dispatch(actions.mapStyle.setSatellite())
                    },
                },
                {
                    title: 'Globe',
                    description: 'Set Globe projection',
                    onTrigger: () => {
                        dispatch(actions.projection.setGlobe())
                    },
                },
                {
                    title: 'Flat',
                    description: 'Set Mercator projection',
                    onTrigger: () => {
                        dispatch(actions.projection.setFlat())
                    },
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
