import { Paper, ScrollArea, Tabs, TabsProps } from '@mantine/core';
import { IconDatabase, IconSettings, IconStack } from '@tabler/icons';
import { LayersPanel } from '../LayersPanel';
import { SourcePanel } from '../SourcePanel';

export function StyledTabs(props: TabsProps) {
    return (
        <Tabs unstyled styles={(theme) => ({
            tab: {
                ...theme.fn.focusStyles(),
                backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
                color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[9],
                border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[4]}`,
                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                cursor: 'pointer',
                fontSize: theme.fontSizes.sm,
                display: 'flex',
                alignItems: 'center',

                '&:disabled': {
                    opacity: 0.5,
                    cursor: 'not-allowed',
                },

                '&:not(:first-of-type)': {
                    borderLeft: 0,
                },

                '&:first-of-type': {
                    borderTopLeftRadius: theme.radius.md,
                    borderBottomLeftRadius: theme.radius.md,
                },

                '&:last-of-type': {
                    borderTopRightRadius: theme.radius.md,
                    borderBottomRightRadius: theme.radius.md,
                },

                '&[data-active]': {
                    backgroundColor: theme.colors.blue[7],
                    borderColor: theme.colors.blue[7],
                    color: theme.white,
                },
            },

            tabIcon: {
                marginRight: theme.spacing.xs,
                display: 'flex',
                alignItems: 'center',
            },

            tabsList: {
                display: 'flex',
            },
        })}
            {...props}
        />
    );
}

export function Left() {
    return (
        <StyledTabs defaultValue={"layers"}>
            <Tabs.List>
                <Tabs.Tab value="layers" icon={<IconStack size={16} />}>
                    Layers
                </Tabs.Tab>
                <Tabs.Tab value="sources" icon={<IconDatabase size={16} />}>
                    Sources
                </Tabs.Tab>
                <Tabs.Tab value="settings" icon={<IconSettings size={16} />}>
                    Settings
                </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="layers">
                <ScrollArea>
                    <Paper p={"sm"} style={{
                        width: 400,
                        overflow: "hidden",
                    }}>
                        <LayersPanel />
                    </Paper>
                </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="sources">
                <Paper p={"sm"} style={{
                    width: 400,
                    overflow: "hidden",
                }}>
                    <SourcePanel />
                </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="settings">
                <Paper p={"sm"} style={{
                    width: 400,
                    overflow: "hidden",
                }}>
                    Settings
                </Paper>
            </Tabs.Panel>
        </StyledTabs>
    );
}