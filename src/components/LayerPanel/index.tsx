import { isRasterTileFormat } from "@/lib/tilejson"
import { actions, selectors } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { LayerType, SourceType } from "@/types"
import { ActionBar } from "@/ui/ActionBar"
import { Flex, Select, TextInput } from "@mantine/core"
import { createSelector } from "@reduxjs/toolkit"
import { IconCopy, IconCrosshair, IconTrash } from "@tabler/icons"
import { useSelector } from "react-redux"
import { ExtrusionControls } from "./ExtrusionControls"
import { HeatmapControls } from "./HeatmapControls"
import { LayerFilter } from "./LayerFilter"
import { LineControls } from "./LineControls"
import { PhotoControls } from "./PhotoControls"
import { PointControls } from "./PointControls"
import { PolygonControls } from "./PolygonControls"

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
            isFilterable:
                !!source &&
                source.type !== SourceType.Raster &&
                !(source.type === SourceType.MVT && isRasterTileFormat(source.format)),
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
        isFilterable,
    } = layer

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
                <LayerFilter layerId={layerId} filterExpression={layer.filterExpression} filterError={filterError} />
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

            {type === LayerType.Point ? (
                <PointControls layerId={layerId} color={color} circleRange={circleRange} />
            ) : type === LayerType.Line ? (
                <LineControls layerId={layerId} color={color} />
            ) : type === LayerType.Polygon ? (
                <PolygonControls layerId={layerId} color={color} />
            ) : type === LayerType.Heatmap ? (
                <HeatmapControls layerId={layerId} heatmapRadius={heatmapRadius} heatmapIntensity={heatmapIntensity} />
            ) : type === LayerType.Photo ? (
                <PhotoControls
                    layerId={layerId}
                    clusterRadius={clusterRadius}
                    srcField={layer.srcField}
                    valueField={layer.valueField}
                    icon={layer.icon}
                    fields={layer.fields}
                />
            ) : type === LayerType.Extrusion ? (
                <ExtrusionControls
                    layerId={layerId}
                    color={color}
                    extrusionHeight={layer.extrusionHeight}
                    extrusionHeightField={layer.extrusionHeightField}
                    extrusionBase={layer.extrusionBase}
                    extrusionBaseField={layer.extrusionBaseField}
                    fields={layer.fields}
                />
            ) : null}
        </Flex>
    )
}
