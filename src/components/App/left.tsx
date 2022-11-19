import { actions } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { ActionIcon, Flex, Paper, ScrollArea, Tabs, TabsProps } from '@mantine/core';
import { IconBulbOff, IconDatabase, IconPlus, IconSettings, IconStack, IconWorld } from '@tabler/icons';
import { LayerPanel } from '../LayerPanel';
import { LayersOutline } from '../LayersOutline';
import { SourcePanel } from '../SourcePanel';
import { SourcesOutline } from '../SourcesOutline';

export function StyledTabs(props: TabsProps) {
    return (
        <Tabs unstyled styles={(theme) => ({
            tab: {
                ...theme.fn.focusStyles(),
                width: "100%",
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
                    borderTopLeftRadius: theme.radius.sm,
                    borderBottomLeftRadius: theme.radius.sm,
                },

                '&:last-of-type': {
                    borderTopRightRadius: theme.radius.sm,
                    borderBottomRightRadius: theme.radius.sm,
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
    const dispatch = useAppDispatch()

    return (
        <StyledTabs defaultValue={"layers"} keepMounted={false}>
            <Tabs.List>
                <Tabs.Tab value="layers" icon={<IconStack size={16} />}>
                    Layers
                </Tabs.Tab>
                <Tabs.Tab value="sources" icon={<IconDatabase size={16} />}>
                    Sources
                </Tabs.Tab>
                <Tabs.Tab value="map-styles" icon={<IconWorld size={16} />} disabled>
                    Styles
                </Tabs.Tab>
                {/* <Tabs.Tab value="settings" icon={<IconSettings size={16} />}>
                    Settings
                </Tabs.Tab> */}
            </Tabs.List>

            <Tabs.Panel value="layers">
                <ScrollArea>
                    <Paper pt={"md"} style={{
                        width: 300,
                        overflow: "hidden",
                    }}>
                        <Flex direction={"row-reverse"} gap={"xs"}>
                            <ActionIcon size={"md"} onClick={() => {
                                dispatch(actions.layer.addBlankLayer())
                            }}>
                                <IconPlus size={16} />
                            </ActionIcon>
                            <ActionIcon size={"md"}>
                                <IconBulbOff size={16} />
                            </ActionIcon>
                        </Flex>
                        <LayersOutline />
                        <LayerPanel />
                    </Paper>
                </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="sources">
                <Paper pt={"md"} style={{
                    width: 300,
                    overflow: "hidden",
                }}>
                    <SourcesOutline />
                    <SourcePanel />
                </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="map-styles">
                <Paper p={"sm"} style={{
                    width: 300,
                    overflow: "hidden",
                }}>
                    Map Styles
                </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="settings">
                <Paper p={"sm"} style={{
                    width: 300,
                    overflow: "hidden",
                }}>
                    Settings
                </Paper>
            </Tabs.Panel>
        </StyledTabs>
    );
}