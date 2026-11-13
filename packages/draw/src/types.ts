import type { Feature, FeatureCollection, Geometry, Point, Position } from "geojson"
import type { AddLayerObject, DistributiveOmit } from "maplibre-gl"
import type { interactions } from "./constants"

/** A Draw feature id. Draw generates string ids; callers may pass numbers. */
export type FeatureId = string | number

/** User properties of a Draw feature. */
export type FeatureProperties = { [key: string]: unknown }

/** Coordinates of each geometry type Draw edits. Polygon rings are closed here, as in GeoJSON. */
export interface CoordinatesMap {
    Point: Position
    LineString: Position[]
    Polygon: Position[][]
    MultiPoint: Position[]
    MultiLineString: Position[][]
    MultiPolygon: Position[][][]
}

export type GeometryKind = keyof CoordinatesMap
export type MultiGeometryKind = "MultiPoint" | "MultiLineString" | "MultiPolygon"
export type SingleGeometryKind = Exclude<GeometryKind, MultiGeometryKind>

/** A geometry of one kind. For a concrete kind it is the matching `@types/geojson` geometry minus `bbox`. */
export interface DrawGeometry<K extends GeometryKind> {
    type: K
    coordinates: CoordinatesMap[K]
}

/** Any geometry Draw edits, as a union discriminated by `type`. */
export type AnyDrawGeometry = { [K in GeometryKind]: DrawGeometry<K> }[GeometryKind]

/** GeoJSON accepted when a Draw feature is created. */
export interface DrawFeatureInput<K extends GeometryKind> {
    id?: FeatureId
    type?: "Feature"
    properties?: FeatureProperties | null
    geometry: DrawGeometry<K>
}

/** A Draw feature exported as GeoJSON. */
export interface DrawGeoJSONFeature<K extends GeometryKind> {
    id: FeatureId
    type: "Feature"
    properties: FeatureProperties | null
    geometry: DrawGeometry<K>
}

/** Properties Draw writes onto the GeoJSON it renders, plus `user_*` copies of user properties. */
export interface DrawRenderProperties {
    id?: FeatureId
    meta?: string
    "meta:type"?: string
    active?: string
    mode?: string | null
    parent?: FeatureId
    coord_path?: string | null
    lng?: number
    lat?: number
    [key: string]: unknown
}

/** A feature Draw renders on the map: a feature, a vertex or a midpoint. */
export interface DrawRenderFeature<G extends { type: GeometryKind } = AnyDrawGeometry> {
    id?: FeatureId
    type: "Feature"
    properties: DrawRenderProperties
    geometry: G
}

/** A rendered Draw feature found under an event. MapLibre's query results satisfy it. */
export interface DrawFeatureTarget {
    type: "Feature"
    properties: DrawRenderProperties
    geometry: Geometry
}

export interface ScreenPoint {
    x: number
    y: number
}

export interface LngLatValue {
    lng: number
    lat: number
}

/** The DOM event behind a map mouse event. A DOM `MouseEvent` satisfies it. */
export interface DrawOriginalMouseEvent {
    button: number
    buttons?: number
    which?: number
    shiftKey?: boolean
    clientX: number
    clientY: number
    stopPropagation(): void
}

/** The DOM event behind a map touch event. A DOM `TouchEvent` satisfies it; it has no client position. */
export interface DrawOriginalTouchEvent {
    shiftKey?: boolean
    clientX?: number
    clientY?: number
    stopPropagation(): void
    preventDefault(): void
}

/** A map mouse event, with the feature under the pointer once Draw has looked it up. */
export interface DrawMouseEvent {
    point: ScreenPoint
    lngLat: LngLatValue
    originalEvent: DrawOriginalMouseEvent
    featureTarget?: DrawFeatureTarget
}

/** A map touch event, with the feature under the finger once Draw has looked it up. */
export interface DrawTouchEvent {
    point: ScreenPoint
    lngLat: LngLatValue
    originalEvent: DrawOriginalTouchEvent
    featureTarget?: DrawFeatureTarget
}

export type DrawPointerEvent = DrawMouseEvent | DrawTouchEvent

/** A keyboard event from the map container. A DOM `KeyboardEvent` satisfies it. */
export interface DrawKeyboardEvent {
    keyCode: number
    srcElement?: unknown
    target: unknown
    preventDefault(): void
}

/** Events a mode receives, by mode handler event name. `mouseout` comes straight from the container. */
export interface DrawModeEventMap {
    drag: DrawPointerEvent
    click: DrawMouseEvent
    mousemove: DrawMouseEvent
    mousedown: DrawMouseEvent
    mouseup: DrawMouseEvent
    mouseout: MouseEvent
    keydown: DrawKeyboardEvent
    keyup: DrawKeyboardEvent
    touchstart: DrawTouchEvent
    touchmove: DrawTouchEvent
    touchend: DrawTouchEvent
    tap: DrawTouchEvent
}

export type DrawModeEventName = keyof DrawModeEventMap

/** A handler result: a truthy value skips the render that would follow. */
export type HandlerResult = unknown

export type Interaction = (typeof interactions)[number]

export interface DrawControls {
    point?: boolean
    line_string?: boolean
    polygon?: boolean
    trash?: boolean
    combine_features?: boolean
    uncombine_features?: boolean
}

type SourcedLayer = Extract<AddLayerObject, { source: string }>

/** A style layer for Draw's features. Without a `source`, Draw adds a hot and a cold copy of it. */
export type DrawStyleLayer = DistributiveOmit<SourcedLayer, "source"> & { source?: string }

export interface DrawActionableState {
    trash: boolean
    combineFeatures: boolean
    uncombineFeatures: boolean
}

export interface ChangeModeEventOptions {
    silent?: boolean
}

export interface DeleteOptions {
    silent?: boolean
}

/** A selected vertex: the feature it belongs to and its path within the feature's coordinates. */
export interface SelectedCoordinate {
    feature_id: FeatureId
    coord_path: string
}

/** Classes Draw sets on the map container, by group; `null` removes the group's class. */
export interface MapClasses {
    mode?: string | null
    feature?: string | null
    mouse?: string | null
}

export type DrawFeatureCollection = FeatureCollection<Geometry, FeatureProperties | null>
export type DrawExportedFeature = Feature<Geometry, FeatureProperties | null>
export type DrawPointFeature = Feature<Point, FeatureProperties | null>
