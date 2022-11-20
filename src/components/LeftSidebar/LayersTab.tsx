import { actions } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Accordion, ActionIcon, Flex, Space } from '@mantine/core';
import { IconBulbOff, IconCrosshair, IconPlus, IconTrash } from '@tabler/icons';
import { useState } from 'react';
import { LayerPanel } from '../LayerPanel';
import { LayersOutline } from '../LayersOutline';

export const LayersTab: React.FC = () => {
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
        <>
            <Flex direction={"row"} gap={"xs"} pl={"sm"} pr={"sm"}>
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
                        paddingLeft: theme.spacing.sm,
                        paddingRight: theme.spacing.sm,
                        backgroundColor: theme.colorScheme === "dark" ? theme.colors.gray[9] : theme.white,
                    },
                    panel: {
                        // paddingTop: theme.spacing.sm,
                        // paddingBottom: theme.spacing.sm,
                        padding: 0,
                    },
                    content: {
                        // paddingLeft: theme.spacing.xs,
                        paddingLeft: theme.spacing.sm,
                        paddingRight: theme.spacing.sm,
                        paddingTop: theme.spacing.sm,
                        paddingBottom: theme.spacing.sm,
                    },
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
        </>
    );
}
