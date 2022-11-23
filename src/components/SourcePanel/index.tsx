import { Badge, Flex, Group, TextInput } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { IconTrash, IconCrosshair, IconStack, IconPencil } from '@tabler/icons';
import { useMantineTheme } from '@mantine/core';
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
            type: source.type,
            size: 0,
            // size: source.data.length,
            location: source.location,
            editable: source.editable,
        }
    })
    const theme = useMantineTheme();
    const getColor = (color: string) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7];

    if (!source) {
        return null
    }

    // let icon: React.ReactNode = (
    //     <IconBraces size={16} color={getColor('blue')} />
    // )
    // if (source.type === SourceType.Geojson) {
    //     icon = (
    //         <IconBraces size={16} color={getColor('blue')} />
    //     )
    // }
    // if (source.type === SourceType.FeatureCollection) {
    //     icon = (
    //         <IconBraces size={16} color={getColor('blue')} />
    //     )
    // }
    // if (source.type === SourceType.Raster) {
    //     icon = (
    //         <IconBraces size={16} color={getColor('blue')} />
    //     )
    // }
    // if (source.type === SourceType.Raster) {
    //     icon = (
    //         <IconBraces size={16} color={getColor('blue')} />
    //     )
    // }
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
                        name: "edit",
                        label: "Switch to edit mode",
                        icon: IconPencil,
                        disabled: !source.editable,
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
