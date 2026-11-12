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
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { createElement, type ReactNode } from "react"
import { fn } from "storybook/test"
import type { ActionBarItem } from "../ActionBar"
import type { FieldEntry } from "../AttributeList"
import type { Command } from "../CommandPalette"
import type { PropertyItem, PropertyItemMeta } from "../PropertiesTable"
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
        onTrigger: fn(),
    },
    {
        id: "add-osm",
        title: "Add OpenStreetMap basemap",
        icon: glyph(IconMap),
        onTrigger: fn(),
    },
    {
        id: "zoom-source",
        title: "Zoom to source",
        description: "Fit the map to the selected source",
        icon: glyph(IconZoomReset),
        onTrigger: fn(),
    },
    {
        id: "toggle-outline",
        title: "Toggle preview outline",
        icon: glyph(IconStack),
        onTrigger: fn(),
    },
]

export const PALETTE_KEY = "k"
export const PALETTE_SHORTCUT = `mod+${PALETTE_KEY.toUpperCase()}`
export const PALETTE_OPEN_KEYS = `{Control>}${PALETTE_KEY}{/Control}`
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

export const LAYER_COLOR = "#e8590c"
export const PALETTE_HINT = `Press Ctrl+${PALETTE_KEY.toUpperCase()} to open the palette`
export const PALETTE_NO_MATCH_QUERY = "zzzz"
export const BUTTON_TYPES: ReadonlyArray<"button" | "submit"> = ["button", "submit"]

export const CONTEXT_MENU_ITEMS = {
    zoom: { label: "Zoom to source", shortcut: "Z", icon: glyph(IconZoomReset) },
    edit: { label: "Edit features", shortcut: "E", icon: glyph(IconPencil) },
    remove: { label: "Remove source", icon: glyph(IconTrash) },
    rename: { label: "Rename" },
}

export const ACTION_BAR_DISABLED_ITEMS: Array<ActionBarItem | null> = ACTION_BAR_ITEMS.filter(
    item => item !== null && item.disabled === true,
)
export const ACTION_BAR_COLORED_ITEMS: Array<ActionBarItem | null> = ACTION_BAR_ITEMS.filter(
    item => item !== null && item.color !== undefined,
)

export const TOOLTIP_DELAY_MS = 0
export const TOOLTIP_CLOSE_DELAY_MS = 0
export const TOOLTIP_DURATION_MS = 100

export const DIALOG_TITLE = "Input URL"
export const DIALOG_NOTICE = "Nothing to configure."
export const DIALOG_FIELD_LABEL = "URL"
export const DIALOG_FIELD_PLACEHOLDER = "https://example.com/tiles/{z}/{x}/{y}.png"
export const DIALOG_SUBMIT_LABEL = "Submit"

export const TREE_FOLDER_ID = TREE_ITEMS.at(0)?.id ?? ""
export const TREE_SELECTED_ID = "source-parcels"
export const TREE_EXPANDED_IDS: ReadonlyArray<string> = [TREE_FOLDER_ID, TREE_SELECTED_ID]

export const PROPERTY_COLUMNS: ReadonlyArray<ColumnDef<PropertyItem>> = [
    { id: "id", accessorKey: "id", header: "id" },
    { id: "name", accessorKey: "name", header: "name" },
    { id: "area", accessorKey: "area", header: "area" },
    { id: "landuse", accessorKey: "landuse", header: "landuse" },
    { id: "year", accessorKey: "year", header: "year" },
]

export const PROPERTY_META: Record<string, PropertyItemMeta> = {
    id: { type: "int", min: 1, max: 3, mean: 2 },
    name: { type: "string", unique: 3 },
    area: { type: "float", min: 980.25, max: 4310, mean: 2180.25, hist: [2, 1, 0, 1] },
    landuse: { type: "string", unique: 3 },
    year: { type: "int", min: 1962, max: 2004, mean: 1984 },
}

export const PROPERTY_PAGE_SIZE = 2
export const PROPERTY_PAGE_COUNT = Math.ceil(PROPERTY_ROWS.length / PROPERTY_PAGE_SIZE)
export const PROPERTY_PAGE_SIZE_OPTIONS: ReadonlyArray<SelectOption> = [
    { value: "2", label: "2 per page" },
    { value: "50", label: "50 per page" },
]
export const PROPERTY_SORT: SortingState = [{ id: "area", desc: true }]
export const PROPERTY_FILTER_ALL = "all"
export const PROPERTY_FILTER_SELECTION = "selection"

export const VIEWER_PROPERTIES: ReadonlyArray<{ key: string; value: string }> = [
    { key: "cadastral_number", value: "77:01:0004012:15" },
    { key: "landuse", value: "residential" },
    { key: "area", value: "1250.5" },
]

const PHOTO_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='#74c0fc'/><circle cx='32' cy='32' r='16' fill='#2f9e44'/></svg>"
export const PHOTO_URL = `data:image/svg+xml,${encodeURIComponent(PHOTO_SVG)}`
export const VIEWER_PROPERTIES_WITH_PHOTO: ReadonlyArray<{ key: string; value: string }> = [
    ...VIEWER_PROPERTIES,
    { key: "photo", value: PHOTO_URL },
]

export const ATTRIBUTE_FIELDS: ReadonlyArray<FieldEntry> = [
    {
        name: "area",
        type: "number",
        nullCount: 3,
        summary: { kind: "numeric", min: 980.25, max: 4310, mean: 2180.25, histogram: [2, 5, 9, 14, 8, 3] },
    },
    {
        name: "landuse",
        type: "string",
        summary: {
            kind: "string",
            unique: 12,
            topValues: [
                ["residential", 40],
                ["commercial", 22],
                ["park", 9],
            ],
        },
    },
    { name: "notes", type: "string", summary: { kind: "loading" } },
    { name: "owner", type: "string", summary: { kind: "error" } },
]

export const INFO_ROW_LABEL = "Features"
export const INFO_ROW_VALUE = "12 480"
export const INFO_ROW_DATA_LABEL = "landuse"
export const INFO_ROW_DATA_VALUE = "residential"

export const SURFACE_TEXT = "Surface content"
export const PANEL_HEADER = "Attributes"
export const PANEL_LINES: ReadonlyArray<string> = SOURCE_NAMES
export const SIDEBAR_TEXT = "Sidebar content"
export const OVERLAY_SLOTS = ["topLeft", "topRight", "left", "right", "top", "bottom"] as const
export const APP_LAYOUT_MAIN = "Main"
export const APP_LAYOUT_LEFT = "Left sidebar"
export const APP_LAYOUT_RIGHT = "Right sidebar"
export const APP_LAYOUT_FOOTER = "Footer"
export const SPINNER_LABEL = "Loading"

export const SECTION_NAMES = ["outline", "details", "history"] as const
export const SECTION_TITLES: Record<(typeof SECTION_NAMES)[number], string> = {
    outline: "Outline",
    details: "Details",
    history: "History",
}

export const SPLIT_LEFT = "Left"
export const SPLIT_RIGHT = "Right"

export const ERROR_MESSAGE = "Failed to read source: unexpected end of file"
export const ROW_ITEMS: ReadonlyArray<string> = ["One", "Two", "Three"]

export const STATUSBAR_BUTTON_LABEL = "Measure"
export const STATUSBAR_SELECT_OPTIONS: ReadonlyArray<SelectOption> = [
    { value: "all", label: "All" },
    { value: "selection", label: "Selection" },
]
export const STATUSBAR_BADGE_TEXT = "EPSG:3857"
export const STATUSBAR_ERROR_TEXT = "Offline"
export const STATUSBAR_BADGE_TITLE = "Coordinate reference system"
