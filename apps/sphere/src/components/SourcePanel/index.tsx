import { actions, selectors } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { sourceKindOf } from "@/lib/source-kind"
import { type SourceKind, type SourceMetadata, SourceType } from "@/types"
import { ActionBar, GAP_PX, PanelBody, Stack, TextField } from "@sphere/ui"
import { createSelector } from "@reduxjs/toolkit"
import { IconCrosshair, IconPencil, IconReload, IconStack, IconTable, IconTrash } from "@tabler/icons-react"
import type { CSSProperties } from "react"
import { useSelector } from "react-redux"
import { FolderPanel } from "./FolderPanel"
import { SourceLayerPanel } from "./SourceLayerPanel"
import { CsvSourcePanel } from "./CsvSourcePanel"
import { GeojsonSourcePanel } from "./GeojsonSourcePanel"
import { GpxSourcePanel } from "./GpxSourcePanel"
import { KmlSourcePanel } from "./KmlSourcePanel"
import { RasterTilesSourcePanel } from "./RasterTilesSourcePanel"
import { ShapefileSourcePanel } from "./ShapefileSourcePanel"
import { VectorTilesSourcePanel } from "./VectorTilesSourcePanel"

const FORM_STYLE: CSSProperties = { marginBottom: GAP_PX.sm }

const reloadAvailable = new Set([SourceType.Geojson])

export const selectPanelKind = createSelector(
    [selectors.source.selectSelectedNode, selectors.source.selectCurrentSourceItem],
    sourceKindOf,
)

export const selector = createSelector(
    [selectors.source.selectSelectedSourceId, selectors.source.selectCurrentSourceItem],
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

function renderPanel(kind: SourceKind | null) {
    switch (kind) {
        case "geojson":
            return <GeojsonSourcePanel />
        case "csv":
            return <CsvSourcePanel />
        case "shapefile":
            return <ShapefileSourcePanel />
        case "gpx":
            return <GpxSourcePanel />
        case "kml":
            return <KmlSourcePanel />
        case "vector-tiles":
            return <VectorTilesSourcePanel />
        case "raster-tiles":
            return <RasterTilesSourcePanel />
        case "source-layer":
            return <SourceLayerPanel />
        case "folder":
            return <FolderPanel />
        default:
            return null
    }
}

export function SourcePanel() {
    const dispatch = useAppDispatch()
    const drawing = useSelector(selectors.draw.isDrawing)
    const source = useSelector(selector)
    const panelKind = useSelector(selectPanelKind)
    const node = useSelector(selectors.source.selectSelectedNode)
    // Source actions take the selected node id; a child resolves to its parent's data here
    const nodeId = useSelector(selectors.source.selectSelectedId)
    const nodeActions = useSelector(selectors.source.selectSelectedNodeActions)

    if (!node) {
        return null
    }
    // A folder has no data source behind it, only a node
    if (!source && node.kind !== "folder") {
        return null
    }
    const editable = source?.editable ?? false
    const reloadDisabled = source?.reloadDisabled ?? true

    const controls = (
        <ActionBar
            onClick={async name => {
                switch (name) {
                    case "trash": {
                        if (nodeId && nodeActions.canRemove) dispatch(actions.source.removeSource(nodeId))
                        break
                    }
                    case "zoom": {
                        if (nodeId && nodeActions.canZoom) dispatch(actions.source.zoomTo(nodeId))
                        break
                    }
                    case "show-properties": {
                        if (source && nodeActions.canShowProperties)
                            dispatch(actions.source.showProperties({ id: source.id }))
                        break
                    }
                    case "add-to-layer": {
                        if (nodeId && nodeActions.canAddLayer) dispatch(actions.layer.addBlankLayer(nodeId))
                        break
                    }
                    case "edit": {
                        if (!source || !editable) break
                        if (drawing) {
                            dispatch(actions.tools.reset())
                        } else {
                            dispatch(actions.draw.start({ sourceId: source.id }))
                        }
                        break
                    }
                    case "reload": {
                        if (source) dispatch(actions.source.reload(source.id))
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
                    disabled: !nodeActions.canRemove,
                },
                null,
                {
                    name: "show-properties",
                    label: "Show properties",
                    icon: IconTable,
                    disabled: !nodeActions.canShowProperties,
                },
                {
                    name: "add-to-layer",
                    label: "Add to layer",
                    icon: IconStack,
                    disabled: !nodeActions.canAddLayer,
                },
                {
                    name: "edit",
                    label: "Switch to edit mode",
                    icon: IconPencil,
                    disabled: !editable,
                },
                {
                    name: "zoom",
                    label: "Zoom to source",
                    icon: IconCrosshair,
                    disabled: !nodeActions.canZoom,
                },
                {
                    name: "reload",
                    label: "Reload",
                    icon: IconReload,
                    disabled: reloadDisabled,
                },
            ]}
        />
    )

    return (
        <PanelBody header={controls}>
            <Stack gap={"md"} align={"stretch"} style={FORM_STYLE}>
                <TextField
                    label="Name"
                    value={node.name}
                    onChange={value => {
                        dispatch(
                            actions.source.setName({
                                id: node.id,
                                value,
                            }),
                        )
                    }}
                />

                {renderPanel(panelKind)}
            </Stack>
        </PanelBody>
    )
}
