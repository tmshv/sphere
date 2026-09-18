import { actions, selectors } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { isRasterTileFormat } from "@/lib/tilejson"
import { type SourceMetadata, SourceType } from "@/types"
import { ActionBar, PanelBody } from "@sphere/ui"
import { Flex, TextInput } from "@mantine/core"
import { createSelector } from "@reduxjs/toolkit"
import { IconCrosshair, IconPencil, IconReload, IconStack, IconTable, IconTrash } from "@tabler/icons"
import { useSelector } from "react-redux"
import { CsvSourcePanel } from "./CsvSourcePanel"
import { GeojsonSourcePanel } from "./GeojsonSourcePanel"
import { GpxSourcePanel } from "./GpxSourcePanel"
import { RasterTilesSourcePanel } from "./RasterTilesSourcePanel"
import { ShapefileSourcePanel } from "./ShapefileSourcePanel"
import { VectorTilesSourcePanel } from "./VectorTilesSourcePanel"

const reloadAvailable = new Set([SourceType.Geojson])

export type PanelKind = "geojson" | "csv" | "shapefile" | "gpx" | "vector-tiles" | "raster-tiles"

export const selectPanelKind = createSelector(
    [selectors.source.selectCurrentSourceItem],
    (source): PanelKind | null => {
        if (!source) {
            return null
        }
        switch (source.type) {
            case SourceType.Geojson:
                return source.format
            case SourceType.FeatureCollection:
                return "geojson"
            case SourceType.MVT:
                return isRasterTileFormat(source.format) ? "raster-tiles" : "vector-tiles"
            case SourceType.Raster:
                return "raster-tiles"
            default:
                return null
        }
    },
)

export const selector = createSelector(
    [selectors.source.selectSelectedId, selectors.source.selectCurrentSourceItem],
    (id, source) => {
        if (!id || !source) {
            return null
        }

        let meta: SourceMetadata | undefined
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
    },
)

function renderPanel(kind: PanelKind | null) {
    switch (kind) {
        case "geojson":
            return <GeojsonSourcePanel />
        case "csv":
            return <CsvSourcePanel />
        case "shapefile":
            return <ShapefileSourcePanel />
        case "gpx":
            return <GpxSourcePanel />
        case "vector-tiles":
            return <VectorTilesSourcePanel />
        case "raster-tiles":
            return <RasterTilesSourcePanel />
        default:
            return null
    }
}

export const SourcePanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const drawing = useSelector(selectors.draw.isDrawing)
    const source = useSelector(selector)
    const panelKind = useSelector(selectPanelKind)

    if (!source) {
        return null
    }

    const controls = (
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
                            dispatch(actions.draw.start({ sourceId: source.id }))
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
    )

    return (
        <PanelBody header={controls}>
            <Flex direction={"column"} gap={"md"} align={"stretch"} mb={"sm"}>
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

                {renderPanel(panelKind)}
            </Flex>
        </PanelBody>
    )
}
