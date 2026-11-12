import {
    IconBulb,
    type IconComponent,
    IconFolder,
    IconLine,
    IconMap,
    IconPencil,
    IconPlus,
    IconPoint,
    IconPolygon,
    IconSearch,
    IconStack,
    IconTrash,
    IconZoomReset,
} from "@sphere/icons"
import { createElement, type ReactNode } from "react"
import type { ActionBarItem } from "../ActionBar"
import type { Command } from "../CommandPalette"
import type { PropertyItem } from "../PropertiesTable"
import type { SelectOption } from "../Select"
import type { TabItem } from "../Tabs"
import type { TreeItem } from "../Tree"
import { ICON_SIZE } from "./layout"

// Shared GIS fixture data for component stories. Later tasks extend this file instead of defining their own.

function glyph(Icon: IconComponent): ReactNode {
    return createElement(Icon, { size: ICON_SIZE })
}

export const SOURCE_NAMES: ReadonlyArray<string> = [
    "Cadastral parcels",
    "Road network",
    "Buildings footprints",
    "Sentinel-2 mosaic",
    "OpenStreetMap",
]

export const LONG_SOURCE_NAME =
    "Municipal cadastral parcels with ownership attributes and zoning overlay, revision 2024-11-12"

export const LAYER_OPTIONS: ReadonlyArray<SelectOption> = [
    { value: "parcels", label: "Parcels" },
    { value: "roads", label: "Roads" },
    { value: "buildings", label: "Buildings" },
    { value: "water", label: "Water bodies" },
]

export const SEGMENT_OPTIONS: ReadonlyArray<SelectOption> = [
    { value: "point", label: "Point" },
    { value: "line", label: "Line" },
    { value: "polygon", label: "Polygon" },
]

// Icon glyphs offered by the IconButton "icon" control.
export const ICON_GLYPHS: Record<string, ReactNode> = {
    Plus: glyph(IconPlus),
    Pencil: glyph(IconPencil),
    Trash: glyph(IconTrash),
    Search: glyph(IconSearch),
    ZoomReset: glyph(IconZoomReset),
}

export const DEFAULT_GLYPH = "Plus"

export const ACTION_BAR_ITEMS: Array<ActionBarItem | null> = [
    { name: "add", label: "Add source", icon: IconPlus },
    { name: "draw", label: "Draw features", icon: IconPencil },
    null,
    { name: "zoom", label: "Zoom to source", icon: IconZoomReset },
    { name: "highlight", label: "Highlight", icon: IconBulb, color: "orange" },
    null,
    { name: "remove", label: "Remove source", icon: IconTrash, disabled: true },
]

export const COMMANDS: ReadonlyArray<Command> = [
    {
        id: "add-file",
        title: "Add file",
        description: "Load GeoJSON, Shapefile, CSV, GPX, KML or MBTiles",
        icon: glyph(IconPlus),
        onTrigger: () => undefined,
    },
    {
        id: "add-osm",
        title: "Add OpenStreetMap basemap",
        icon: glyph(IconMap),
        onTrigger: () => undefined,
    },
    {
        id: "zoom-source",
        title: "Zoom to source",
        description: "Fit the map to the selected source",
        icon: glyph(IconZoomReset),
        onTrigger: () => undefined,
    },
    {
        id: "toggle-outline",
        title: "Toggle preview outline",
        icon: glyph(IconStack),
        onTrigger: () => undefined,
    },
]

export const PALETTE_SHORTCUT = "mod+K"
export const PALETTE_PLACEHOLDER = "Search commands"
export const PALETTE_EMPTY_MESSAGE = "Nothing found"

export const PROPERTY_ROWS: ReadonlyArray<PropertyItem> = [
    { id: 1, name: "Parcel 77:01:0004012:15", area: 1250.5, landuse: "residential", year: 1987 },
    { id: 2, name: "Parcel 77:01:0004012:16", area: 980.25, landuse: "commercial", year: 2004 },
    { id: 3, name: "Parcel 77:01:0004013:02", area: 4310, landuse: "park", year: 1962 },
]

export const TREE_ITEMS: ReadonlyArray<TreeItem> = [
    {
        id: "folder-cadastre",
        label: "Cadastre",
        icon: glyph(IconFolder),
        children: [
            {
                id: "source-parcels",
                label: "Cadastral parcels",
                icon: glyph(IconMap),
                children: [
                    { id: "layer-parcels-polygons", label: "parcels", icon: glyph(IconPolygon) },
                    { id: "layer-parcels-points", label: "survey_marks", icon: glyph(IconPoint) },
                ],
            },
            { id: "source-buildings", label: "Buildings footprints", icon: glyph(IconMap) },
        ],
    },
    {
        id: "source-roads",
        label: "Road network",
        icon: glyph(IconMap),
        children: [{ id: "layer-roads-lines", label: "roads", icon: glyph(IconLine) }],
    },
]

export const TAB_ITEMS: ReadonlyArray<TabItem> = [
    { value: "sources", label: "Sources", icon: glyph(IconFolder), content: "Sources outline" },
    { value: "layers", label: "Layers", icon: glyph(IconStack), content: "Layers outline" },
    { value: "search", label: "Search", content: "Search results", disabled: true },
]

export const LONG_TAB_ITEMS: ReadonlyArray<TabItem> = [
    { value: "long", label: LONG_SOURCE_NAME, content: "Long label content" },
    { value: "short", label: "Layers", content: "Layers outline" },
]

export const TEXT_FIELD_LABEL = "Source name"
export const TEXT_FIELD_PLACEHOLDER = "Enter a name"
export const TEXT_FIELD_VALUE = "Cadastral parcels"
export const TEXT_FIELD_ERROR = "A source with this name already exists"
export const LONG_FIELD_VALUE = `${LONG_SOURCE_NAME}, exported from the municipal geoportal`

export const COLOR_LABEL = "Fill color"
export const COLOR_VALUE = "#2f9e44"

export const SLIDER_LABEL = "Opacity"
export const SLIDER_MIN = 0
export const SLIDER_MAX = 100
export const SLIDER_STEP = 1
export const SLIDER_VALUE = 80

export const SELECT_LABEL = "Layer"
export const SELECT_PLACEHOLDER = "Pick a layer"
export const SEGMENT_LABEL = "Geometry"
export const SEGMENT_VALUE = "polygon"

export const MENU_LABEL = "Source"
export const LONG_MENU_ITEM = `Zoom to ${LONG_SOURCE_NAME}`
export const LONG_SHORTCUT = "Ctrl+Shift+Alt+Option+Command+K"
export const TOOLTIP_LABEL = "Add source"
export const BUTTON_LABEL = "Add source"
