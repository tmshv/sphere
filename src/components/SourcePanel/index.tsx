import { Badge, Flex, Group, TextInput } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { IconTrash, IconCrosshair, IconStack, IconPencil, IconTable } from '@tabler/icons';
import { useMantineTheme } from '@mantine/core';
import { actions } from "@/store";
import { ActionBar } from "@/ui/ActionBar";
import { SourceMetadata, SourceType } from "@/types";

export const SourcePanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const drawing = useAppSelector(state => !!state.draw.sourceId)
    const source = useAppSelector(state => {
        const id = state.selection.sourceId
        if (!id) {
            return null
        }

        const source = state.source.items[id]
        if (!source) {
            return null
        }

        let meta: SourceMetadata | undefined = undefined
        if ((source.type === SourceType.FeatureCollection) && !source.pending) {
            meta = source.meta
        }

        return {
            id,
            name: source.name,
            type: source.type,
            size: 0,
            // size: source.data.length,
            location: source.location,
            editable: source.editable,
            meta,
        }
    })
    const theme = useMantineTheme();
    const getColor = (color: string) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7];

    if (!source) {
        return null
    }

    const { meta } = source

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
                        case "show-properties": {
                            dispatch(actions.source.showProperties({ id: source.id }))
                            break
                        }
                        case "add-to-layer": {
                            dispatch(actions.layer.addBlankLayer(source.id))
                            break
                        }
                        case "edit": {
                            if (drawing) {
                                dispatch(actions.draw.cancel())
                            } else {
                                dispatch(actions.draw.start({
                                    sourceId: source.id,
                                }))
                            }
                            break
                        }
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
                        name: "show-properties",
                        label: "Show properties",
                        icon: IconTable,
                    },
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

            {!meta ? null : (
                <>
                    <Badge radius={"sm"} size={"xs"}>
                        Points={meta.pointsCount}
                    </Badge>
                    <Badge radius={"sm"} size={"xs"}>
                        Lines={meta.linesCount}
                    </Badge>
                    <Badge radius={"sm"} size={"xs"}>
                        Polygons={meta.polygonsCount}
                    </Badge>
                </>
            )}
        </Flex>
    )
}
