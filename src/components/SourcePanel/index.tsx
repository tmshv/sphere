import { Badge, Button, Flex, Group, Select, TextInput } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { IconPolygon, IconPoint, IconLine, IconTrash, IconCrosshair, IconStack } from '@tabler/icons';
import { useMantineTheme } from '@mantine/core';
import { SourceType } from "../../types";
import { actions } from "@/store";
import { ActionBar } from "@/ui/ActionBar";

export const SourcePanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const source = useAppSelector(state => {
        const id = state.selection.sourceId
        if (!id) {
            return
        }

        const source = state.source.items[id]
        if (!source) {
            return
        }

        return {
            id,
            name: source.name,
            type: source.dataset.type,
            size: source.dataset.data.length,
            location: source.location,
        }
    })
    const theme = useMantineTheme();
    const getColor = (color: string) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7];

    if (!source) {
        return null
    }

    // sources.map(source => {
    let icon: React.ReactNode = null

    if (source.type === SourceType.Points) {
        icon = (
            <IconPoint size={20} color={getColor('blue')} />
        )
    }
    if (source.type === SourceType.Lines) {
        icon = (
            <IconLine size={20} color={getColor('blue')} />
        )
    }
    if (source.type === SourceType.Polygons) {
        icon = (
            <IconPolygon size={20} color={getColor('blue')} />
        )
    }
    return (
        <Flex direction={"column"} gap={"md"} align={"stretch"} mb={"sm"}>
            <ActionBar
                tooltipPosition={"top"}
                onClick={name => {
                    switch (name) {
                        case "trash": {
                            dispatch(actions.source.removeSource(source.id))
                            break
                        }
                        case "zoom": {
                            dispatch(actions.source.zoomTo(source.id))
                            break
                        }
                        // case "add-to-layer": {
                        //     dispatch(actions.source.zoomTo(source.id))
                        //     break
                        // }
                        default: {
                        }
                    }
                }}
                items={[
                    {
                        name: "trash",
                        label: "Delete source",
                        icon: IconTrash,
                        color: "red",
                    },
                    null,
                    {
                        name: "add-to-layer",
                        label: "Add to layer",
                        icon: IconStack,
                    },
                    {
                        name: "zoom",
                        label: "Zoom to source",
                        icon: IconCrosshair,
                    },
                ]}
            />
            <TextInput
                size="xs"
                label="Name"
                value={source.name}
                onChange={event => {
                    const value = event.target.value
                    dispatch(actions.source.setName({
                        id: source.id,
                        value,
                    }))
                }}
            />

            <Group>
                <Badge radius={"sm"}>
                    {source.type}
                </Badge>
                <Badge radius={"sm"}>
                    SIZE:{source.size}
                </Badge>
            </Group>

            <Badge radius={"sm"} size={"xs"}>
                {source.location}
            </Badge>
        </Flex>
    )
}
