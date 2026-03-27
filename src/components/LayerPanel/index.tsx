import { actions, selectors } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import type { PhotoIconLayout } from "@/store/layer"
import { LayerType, SourceType } from "@/types"
import { isRasterTileFormat } from "@/lib/tilejson"
import { ActionBar } from "@/ui/ActionBar"
import { ActionIcon, Badge, ColorPicker, Flex, Input, Select, Slider, TextInput } from "@mantine/core"
import { createSelector } from "@reduxjs/toolkit"
import { IconCopy, IconCrosshair, IconTrash, IconX } from "@tabler/icons"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

type Option = {
    value: string
    label: string
}

const RASTER_LAYER_TYPE_OPTIONS = [{ value: LayerType.Raster, label: "Raster" }]

const ALL_LAYER_TYPE_OPTIONS = [
    { value: LayerType.Point, label: "Points" },
    { value: LayerType.Line, label: "Lines" },
    { value: LayerType.Polygon, label: "Polygons" },
    { value: LayerType.Photo, label: "Photos" },
    { value: LayerType.Heatmap, label: "Heatmap" },
    { value: LayerType.Extrusion, label: "Extrusion" },
]

const sourcesSelector = createSelector([selectors.source.items, selectors.source.allIds], (items, allIds) => {
    return allIds.reduce(
        (acc, id) => {
            const source = items[id]
            if (!source.pending) {
                acc.push({
                    value: id,
                    label: items[id].name,
                    type: items[id].type,
                })
            }
            return acc
        },
        [] as Array<Option & { type: SourceType }>,
    )
})

export const selectCurrentLayerItem = createSelector(
    [selectors.layer.selectSelectedId, selectors.layer.items],
    (id, items) => (id ? (items[id] ?? null) : null),
)

export const selectCurrentLayerSourceItem = createSelector(
    [selectCurrentLayerItem, selectors.source.items],
    (layer, items) => (layer?.sourceId ? (items[layer.sourceId] ?? null) : null),
)

export const layerSelector = createSelector(
    [selectors.layer.selectSelectedId, selectCurrentLayerItem, selectCurrentLayerSourceItem],
    (layerId, layer, source) => {
        if (!layerId || !layer) {
            return null
        }

        let sourceLayers: Option[] | undefined
        let fields: string[] | undefined
        if (source) {
            switch (source.type) {
                case SourceType.MVT: {
                    sourceLayers = source.sourceLayers.map(({ id }) => ({
                        value: id,
                        label: id,
                    }))
                    const vl = source.tilejson.vector_layers?.find(x => x.id === layer.sourceLayer)
                    if (vl) {
                        fields = Object.keys(vl.fields)
                    }
                    break
                }
                case SourceType.Geojson: {
                    fields = Object.keys(source.meta.columns)
                    break
                }
                default: {
                    break
                }
            }
        }

        return {
            id: layerId,
            name: layer.name,
            type: layer.type,
            visible: layer.visible,
            sourceId: layer.sourceId,
            sourceLayer: layer.sourceLayer,
            sourceLayers,
            srcField: layer.photo?.srcField,
            valueField: layer.photo?.valueField,
            fields: fields ?? [],
            color: layer.color,
            circleRange: [layer.circle?.minRadius ?? 2, layer.circle?.maxRadius ?? 6] as [number, number],
            heatmapRadius: layer.heatmap?.radius ?? 10,
            heatmapIntensity: layer.heatmap?.intensity ?? 1,
            icon: layer.photo?.icon,
            clusterRadius: layer.photo?.clusterRadius ?? 100,
            extrusionBase: layer.extrusion?.base ?? 0,
            extrusionHeight: layer.extrusion?.height ?? 0,
            extrusionBaseField: layer.extrusion?.baseField,
            extrusionHeightField: layer.extrusion?.heightField,
            filterExpression: layer.filter?.expression ?? null,
            filterError: layer.filter?.error ?? null,
            isTileSource: source?.type === SourceType.MVT || source?.type === SourceType.Raster,
            isFilterable:
                source?.type !== SourceType.Raster &&
                !(source?.type === SourceType.MVT && isRasterTileFormat(source.format)),
            isRasterMvt:
                (source?.type === SourceType.MVT && isRasterTileFormat(source.format)) ||
                source?.type === SourceType.Raster,
            layerTypeOptions:
                (source?.type === SourceType.MVT && isRasterTileFormat(source.format)) ||
                source?.type === SourceType.Raster
                    ? RASTER_LAYER_TYPE_OPTIONS
                    : ALL_LAYER_TYPE_OPTIONS,
        }
    },
)

export const LayerPanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const sources = useSelector(sourcesSelector)
    const layer = useSelector(layerSelector)
    const [filterText, setFilterText] = useState("")
    const [filterLocalError, setFilterLocalError] = useState<string | null>(null)
    useEffect(() => {
        setFilterText(layer?.filterExpression ? JSON.stringify(layer.filterExpression) : "")
        setFilterLocalError(null)
    }, [layer?.id, layer?.filterExpression])

    if (!layer) {
        return null
    }
    const {
        id: layerId,
        sourceId,
        sourceLayer,
        sourceLayers,
        name,
        type,
        color,
        circleRange,
        clusterRadius,
        heatmapRadius,
        heatmapIntensity,
        filterError,
        isTileSource,
        isFilterable,
    } = layer

    function handleFilterChange(text: string) {
        setFilterText(text)
        if (!text.trim()) {
            setFilterLocalError(null)
            dispatch(actions.layer.setLayerFilter({ id: layerId, expression: null }))
            return
        }
        try {
            const expression = JSON.parse(text)
            if (Array.isArray(expression)) {
                setFilterLocalError(null)
                dispatch(actions.layer.setLayerFilter({ id: layerId, expression: expression as unknown[] }))
            }
        } catch {
            // don't show error while typing
        }
    }

    function handleFilterBlur() {
        if (!filterText.trim()) return
        try {
            const expression = JSON.parse(filterText)
            if (!Array.isArray(expression)) {
                setFilterLocalError("Filter must be a JSON array")
            }
        } catch {
            setFilterLocalError("Invalid JSON expression")
        }
    }

    function clearFilter() {
        setFilterText("")
        setFilterLocalError(null)
        dispatch(actions.layer.setLayerFilter({ id: layerId, expression: null }))
    }

    return (
        <Flex direction={"column"} gap={"md"} align={"stretch"} mb={"sm"}>
            <ActionBar
                tooltipPosition={"top"}
                onClick={name => {
                    switch (name) {
                        case "trash": {
                            dispatch(actions.layer.removeLayer(layerId))
                            break
                        }
                        case "zoom": {
                            if (!sourceId) break
                            dispatch(actions.source.zoomTo(sourceId))
                            break
                        }
                        case "duplicate": {
                            dispatch(actions.layer.duplicate(layerId))
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
                        label: "Delete layer",
                        disabled: !layerId,
                        icon: IconTrash,
                        color: "red",
                    },
                    null,
                    {
                        name: "duplicate",
                        label: "Duplicate layer",
                        icon: IconCopy,
                    },
                    {
                        name: "zoom",
                        label: "Zoom to layer",
                        disabled: !sourceId,
                        icon: IconCrosshair,
                    },
                ]}
            />
            <TextInput
                size="xs"
                label="Name"
                value={name}
                onChange={event => {
                    const value = event.target.value
                    dispatch(
                        actions.layer.setName({
                            id: layerId,
                            value,
                        }),
                    )
                }}
            />

            <Select
                size="xs"
                label="Source"
                placeholder="Pick one"
                value={sourceId}
                data={sources}
                onChange={newSourceId => {
                    if (!newSourceId) {
                        return
                    }
                    dispatch(
                        actions.layer.setSource({
                            id: layerId,
                            sourceId: newSourceId,
                        }),
                    )
                }}
            />

            {!isFilterable ? null : (
                <TextInput
                    size="xs"
                    label="Filter"
                    placeholder='["==", ["get", "field"], "value"]'
                    value={filterText}
                    error={filterLocalError ?? filterError ?? undefined}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    rightSection={
                        filterText ? (
                            <ActionIcon size="xs" onClick={clearFilter}>
                                <IconX size={10} />
                            </ActionIcon>
                        ) : null
                    }
                    onChange={e => handleFilterChange(e.currentTarget.value)}
                    onBlur={handleFilterBlur}
                />
            )}

            {!sourceLayers?.length ? null : (
                <Select
                    size="xs"
                    label="Source layer"
                    placeholder="Pick one"
                    value={sourceLayer}
                    data={sourceLayers}
                    onChange={value => {
                        if (!value || !sourceId) {
                            return
                        }
                        dispatch(
                            actions.layer.setSource({
                                id: layerId,
                                sourceId,
                                sourceLayer: value,
                            }),
                        )
                    }}
                />
            )}

            <Select
                size="xs"
                label="View"
                placeholder="Pick one"
                value={type}
                data={layer.layerTypeOptions}
                onChange={value => {
                    if (value) {
                        dispatch(
                            actions.layer.setType({
                                id: layerId,
                                type: value as LayerType,
                            }),
                        )
                    }
                }}
            />

            {!(
                type === LayerType.Point ||
                type === LayerType.Line ||
                type === LayerType.Polygon ||
                type === LayerType.Extrusion
            ) ? null : (
                <>
                    <Input.Wrapper
                        label={
                            <>
                                Color
                                <Badge ml={"xs"} size="xs" radius={"sm"}>
                                    {color}
                                </Badge>
                            </>
                        }
                        size="xs"
                    >
                        <ColorPicker
                            format="hex"
                            size="xs"
                            value={color}
                            styles={theme => ({
                                wrapper: {
                                    width: "100%",
                                },
                                saturation: {
                                    height: 130,
                                },
                                slider: {
                                    marginTop: theme.spacing.sm,
                                },
                            })}
                            onChange={color => {
                                dispatch(actions.layer.setColor({ id: layerId, color }))
                            }}
                        />
                    </Input.Wrapper>
                </>
            )}

            {!(type === LayerType.Point) ? null : (
                <>
                    <Input.Wrapper label="Radius" size="xs">
                        <Slider
                            size={"xs"}
                            min={1}
                            max={10}
                            value={circleRange[1]}
                            onChange={max => {
                                dispatch(
                                    actions.layer.setCircleRadius({
                                        id: layerId,
                                        min: 0,
                                        max,
                                    }),
                                )
                            }}
                        />
                    </Input.Wrapper>
                </>
            )}

            {!(type === LayerType.Heatmap) ? null : (
                <>
                    <Input.Wrapper label="Radius" size="xs">
                        <Slider
                            label={"Radius"}
                            size={"xs"}
                            min={2}
                            max={30}
                            value={heatmapRadius}
                            onChange={value => {
                                dispatch(
                                    actions.layer.setHeatmapParameters({
                                        id: layerId,
                                        radius: value,
                                    }),
                                )
                            }}
                        />
                    </Input.Wrapper>
                    <Input.Wrapper label="Intensity" size="xs">
                        <Slider
                            label={"Intensity"}
                            size={"xs"}
                            min={1}
                            max={5}
                            value={heatmapIntensity}
                            onChange={value => {
                                dispatch(
                                    actions.layer.setHeatmapParameters({
                                        id: layerId,
                                        intensity: value,
                                    }),
                                )
                            }}
                        />
                    </Input.Wrapper>
                </>
            )}

            {!(type === LayerType.Photo) ? null : (
                <>
                    <Input.Wrapper label="Radius" size="xs">
                        <Slider
                            label={"Radius"}
                            size={"xs"}
                            min={50}
                            max={200}
                            value={clusterRadius}
                            onChange={value => {
                                dispatch(
                                    actions.layer.setPhotoClusterRadius({
                                        id: layerId,
                                        value,
                                    }),
                                )
                            }}
                        />
                    </Input.Wrapper>
                    <Select
                        size="xs"
                        label="Image field"
                        placeholder="Pick one"
                        value={layer.srcField}
                        data={layer.fields}
                        onChange={src => {
                            if (src) {
                                dispatch(
                                    actions.layer.setPhotoField({
                                        id: layerId,
                                        src,
                                    }),
                                )
                            }
                        }}
                    />
                    <Select
                        size="xs"
                        label="Value field"
                        placeholder="Pick one"
                        value={layer.valueField}
                        data={layer.fields}
                        onChange={value => {
                            if (value) {
                                dispatch(
                                    actions.layer.setPhotoField({
                                        id: layerId,
                                        value,
                                    }),
                                )
                            }
                        }}
                    />
                    <Select
                        size="xs"
                        label="Layout"
                        placeholder="Pick one"
                        value={layer.icon}
                        data={[
                            { value: "square", label: "Square" },
                            { value: "circle", label: "Circle" },
                        ]}
                        onChange={(value: PhotoIconLayout) => {
                            if (value) {
                                dispatch(
                                    actions.layer.setPhotoIconLayout({
                                        id: layerId,
                                        value,
                                    }),
                                )
                            }
                        }}
                    />
                </>
            )}

            {!(type === LayerType.Extrusion) ? null : (
                <>
                    <Input.Wrapper label="Height" size="xs">
                        <Slider
                            label={"Height"}
                            size={"xs"}
                            min={0}
                            max={10}
                            value={layer.extrusionHeight}
                            onChange={value => {
                                dispatch(
                                    actions.layer.setExtrusionOptions({
                                        id: layerId,
                                        height: value,
                                    }),
                                )
                            }}
                        />
                    </Input.Wrapper>
                    <Select
                        size="xs"
                        label="Height field"
                        placeholder="Pick one"
                        value={layer.extrusionHeightField}
                        data={layer.fields}
                        onChange={value => {
                            if (value) {
                                dispatch(
                                    actions.layer.setExtrusionOptions({
                                        id: layerId,
                                        heightField: value,
                                    }),
                                )
                            }
                        }}
                    />
                    <Input.Wrapper label="Base" size="xs">
                        <Slider
                            label={"Base"}
                            size={"xs"}
                            min={0}
                            max={10}
                            value={layer.extrusionBase}
                            onChange={value => {
                                dispatch(
                                    actions.layer.setExtrusionOptions({
                                        id: layerId,
                                        base: value,
                                    }),
                                )
                            }}
                        />
                    </Input.Wrapper>
                    <Select
                        size="xs"
                        label="Base field"
                        placeholder="Pick one"
                        value={layer.extrusionBaseField}
                        data={layer.fields}
                        onChange={value => {
                            if (value) {
                                dispatch(
                                    actions.layer.setExtrusionOptions({
                                        id: layerId,
                                        baseField: value,
                                    }),
                                )
                            }
                        }}
                    />
                </>
            )}
        </Flex>
    )
}
