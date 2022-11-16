import { CopyButton, Menu, Text } from '@mantine/core';
import { IconCopy, IconSearch } from '@tabler/icons';
import { useMap } from 'react-map-gl';
import { useCursor } from '../../hooks/useCursor';
import { ContextMenu } from "../../ui/ContextMenu";

export type LocationToString = (coord: [number, number]) => string

export type MapContextMenuProps = {
    id: string
    copyLocationValue: LocationToString
}

export const MapContextMenu: React.FC<MapContextMenuProps> = ({ id, copyLocationValue }) => {
    const { [id]: ref } = useMap()
    const coord = useCursor(ref)

    return (
        <ContextMenu>
            <Menu.Label>Map</Menu.Label>
            <CopyButton value={copyLocationValue(coord)}>
                {({ copy }) => (
                    <Menu.Item
                        icon={(
                            <IconCopy size={14} />
                        )}
                        onClick={copy}
                    >
                        Copy location
                    </Menu.Item>
                )}
            </CopyButton>
            {/* <Menu.Item icon={<IconSettings size={14} />}>Settings</Menu.Item> */}
            {/* <Menu.Item icon={<IconMessageCircle size={14} />}>Messages</Menu.Item> */}
            {/* <Menu.Item icon={<IconPhoto size={14} />}>Gallery</Menu.Item> */}
            <Menu.Item
                disabled
                icon={(
                    <IconSearch size={14} />
                )}
                rightSection={(
                    <Text size="xs" color="dimmed">⌘K</Text>
                )}
            >
                Search
            </Menu.Item>

            {/* <Menu.Divider /> */}
            {/* <Menu.Label>Danger zone</Menu.Label> */}
            {/* <Menu.Item icon={<IconArrowsLeftRight size={14} />}>Transfer my data</Menu.Item> */}
            {/* <Menu.Item color="red" icon={<IconTrash size={14} />}>Delete my account</Menu.Item> */}
        </ContextMenu>
    );
}
