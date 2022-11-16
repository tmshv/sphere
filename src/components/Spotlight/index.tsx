import { SpotlightProvider } from '@mantine/spotlight';
// import type { SpotlightAction } from '@mantine/spotlight';
import { IconHome, IconDashboard, IconFileText, IconSearch } from '@tabler/icons';
import { useContext } from 'react';
import { AppStateContext } from '../../state';

export type SpotlightProps = {
    children: React.ReactNode
}

export const Spotlight: React.FC<SpotlightProps> = ({ children }) => {
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
                // {
                //     title: 'Home',
                //     description: 'Get to home page',
                //     onTrigger: () => console.log('Home'),
                //     icon: <IconHome size={18} />,
                // },
                // {
                //     title: 'Dashboard',
                //     description: 'Get full information about current system status',
                //     onTrigger: () => console.log('Dashboard'),
                //     icon: <IconDashboard size={18} />,
                // },
                // {
                //     title: 'Documentation',
                //     description: 'Visit documentation to lean more about all features',
                //     onTrigger: () => console.log('Documentation'),
                //     icon: <IconFileText size={18} />,
                // },
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
