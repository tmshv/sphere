import { selectionGetIds } from "@/lib/selection-ipc"
import { actions, selectors } from "@/store"
import type { RootState } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { type SourceMetadata, SourceType } from "@/types"
import { ActionBar } from "@/ui/ActionBar"
import { Badge, Flex, Group, TextInput } from "@mantine/core"
import { createSelector } from "@reduxjs/toolkit"
import { IconCrosshair, IconPencil, IconReload, IconStack, IconTable, IconTrash } from "@tabler/icons"
import { useSelector, useStore } from "react-redux"

const reloadAvailable = new Set([SourceType.Geojson])

export const selectCurrentSourceItem = createSelector(
    [selectors.source.selectSelectedId, selectors.source.items],
    (id, items) => (id ? (items[id] ?? null) : null),
)

export const selector = createSelector([selectors.source.selectSelectedId, selectCurrentSourceItem], (id, source) => {
    if (!id || !source) {
        return null
    }

    let meta: SourceMetadata | undefined = undefined
    if (source.type === SourceType.Geojson) {
        meta = source.meta
    } else if (source.type === SourceType.FeatureCollection && !source.pending) {
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
        reloadDisabled: !reloadAvailable.has(source.type),
    }
})

export const SourcePanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const store = useStore<RootState>()
    const drawing = useSelector(selectors.draw.isDrawing)
    const source = useSelector(selector)

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
                onClick={async name => {
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
                            if (!source.editable) break
                            if (drawing) {
                                dispatch(actions.tools.reset())
                            } else {
                                const sel = store.getState().selection
                                let selectedIds: number[] = []
                                if (sel.count > 0 && sel.sourceId === source.id) {
                                    const versionBefore = sel.version
                                    try {
                                        selectedIds = await selectionGetIds()
                                    } catch {
                                        selectedIds = []
                                    }
                                    const selAfter = store.getState().selection
                                    if (selAfter.sourceId !== source.id || selAfter.version !== versionBefore) {
                                        selectedIds = []
                                    }
                                }
                                dispatch(
                                    actions.draw.start({
                                        sourceId: source.id,
                                        selectedIds,
                                    }),
                                )
                                dispatch(actions.tools.setTool("draw"))
                            }
                            break
                        }
                        case "reload": {
                            dispatch(actions.source.reload(source.id))
                            break
                        }
                        default: {
                            break
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
                    {
                        name: "reload",
                        label: "Reload",
                        icon: IconReload,
                        disabled: source.reloadDisabled,
                    },
                ]}
            />
            <TextInput
                size="xs"
                label="Name"
                value={source.name}
                onChange={event => {
                    const value = event.target.value
                    dispatch(
                        actions.source.setName({
                            id: source.id,
                            value,
                        }),
                    )
                }}
            />

            <Group>
                <Badge radius={"sm"}>{source.type}</Badge>
                <Badge radius={"sm"}>SIZE:{source.size}</Badge>
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
