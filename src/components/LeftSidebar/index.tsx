import { actions } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Accordion, ActionIcon, Flex, Paper, Space, Tabs, TabsProps } from '@mantine/core';
import { IconBulbOff, IconCrosshair, IconDatabase, IconPlus, IconStack, IconTrash, IconWorld } from '@tabler/icons';
import { useState } from 'react';
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
                // padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                height: 30,
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

export const LeftSidebar: React.FC = () => {
    const dispatch = useAppDispatch()
    const [layerId, sourceId] = useAppSelector(state => {
        const layerId = state.selection.layerId
        if (!layerId) {
            return [undefined, undefined]
        }
        const sourceId = state.layer.items[layerId].sourceId
        return [layerId, sourceId]
    })
    const [value, setValue] = useState<string[]>([]);

    return (
        <StyledTabs defaultValue={"layers"} keepMounted={false}>
            <Tabs.List pl={"md"} pr={"md"} pt={"sm"} pb={"sm"}>
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
                <Flex direction={"row"} gap={"xs"} pl={"md"} pr={"md"}>
                    <ActionIcon size={"md"} disabled={!layerId}>
                        <IconTrash size={16} color={"red"} onClick={() => {
                            dispatch(actions.layer.removeLayer(layerId!))
                        }} />
                    </ActionIcon>
                    <ActionIcon size={"md"} disabled={!sourceId}>
                        <IconCrosshair size={16} onClick={() => {
                            dispatch(actions.source.zoomTo(sourceId!))
                        }} />
                    </ActionIcon>

                    <Space style={{ flex: 1 }} />

                    <ActionIcon size={"md"}>
                        <IconBulbOff size={16} />
                    </ActionIcon>
                    <ActionIcon size={"md"} onClick={() => {
                        dispatch(actions.layer.addBlankLayer())
                    }}>
                        <IconPlus size={16} />
                    </ActionIcon>
                </Flex>

                <Accordion multiple
                    value={value}
                    onChange={setValue}
                    pt={"sm"}
                    variant="default"
                    styles={theme => ({
                        item: {
                            "&:first-of-type": {
                                borderTop: `1px solid ${theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[3]}`,
                            },
                        },
                        control: {
                            height: 30,
                            paddingTop: theme.spacing.xs,
                            paddingBottom: theme.spacing.xs,
                            paddingLeft: theme.spacing.md,
                            paddingRight: theme.spacing.md,
                            backgroundColor: theme.colorScheme === "dark" ? theme.colors.gray[9] : theme.white,
                        },
                        panel: {
                            // paddingTop: theme.spacing.sm,
                            // paddingBottom: theme.spacing.sm,
                            padding: 0,
                        },
                        content: {
                            // padding: 0,
                            paddingLeft: theme.spacing.md,
                            paddingRight: theme.spacing.md,
                            paddingTop: theme.spacing.sm,
                            paddingBottom: theme.spacing.sm,
                        },
                        // "control:first-item": {
                        //     backgroundColor: theme.colors.lime[9],
                        // },
                    })}
                // chevronPosition="left"
                >
                    <Accordion.Item value={"outline"}>
                        <Accordion.Control>
                            Outline
                        </Accordion.Control>
                        <Accordion.Panel>
                            <LayersOutline />
                        </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value={"layer-properties"}>
                        <Accordion.Control>
                            Layer properties
                        </Accordion.Control>
                        <Accordion.Panel>
                            <LayerPanel />
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
                {/* </Paper>
                </ScrollArea> */}
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
