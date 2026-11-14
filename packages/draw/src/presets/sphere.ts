import type { DrawStyleLayer } from "../types"

/** What the sphere preset needs to match the app's preview layers. */
export type SpherePresetOptions = {
    // Colour of features that are not selected
    color: string
    // Colour of selected (active) features, and of vertices and midpoints
    highlightColor: string
    // Draw the white casing under lines, the inner polygon outline and the point stroke
    outline: boolean
    pointRadius: number
}

const WHITE = "white"
const FILL_OPACITY = 0.15
const LINE_WIDTH = 1
const CASING_WIDTH = 3
const INNER_OUTLINE_OFFSET = -1
const POINT_STROKE_WIDTH = 1
const NO_STROKE_WIDTH = 0
const ACTIVE_DASH = [0.2, 2]
const VERTEX_RING_RADIUS = 5
const VERTEX_RADIUS = 3
const MIDPOINT_RING_RADIUS = 4
const MIDPOINT_RADIUS = 2

type Filter = NonNullable<DrawStyleLayer["filter"]>

const INACTIVE: Filter = ["==", "active", "false"]
const ACTIVE: Filter = ["==", "active", "true"]
const NOT_STATIC: Filter = ["!=", "mode", "static"]
const POLYGON: Filter = ["==", "$type", "Polygon"]
const LINE: Filter = ["==", "$type", "LineString"]
const POINT: Filter = ["==", "$type", "Point"]
const FEATURE_POINT: Filter = ["==", "meta", "feature"]

const ROUND_LINE = { "line-cap": "round", "line-join": "round" } as const

function inactive(...parts: Filter[]): Filter {
    return ["all", INACTIVE, ...parts, NOT_STATIC]
}

function active(...parts: Filter[]): Filter {
    return ["all", ACTIVE, ...parts]
}

function supplementary(meta: "vertex" | "midpoint"): Filter {
    return ["all", POINT, ["==", "meta", meta], NOT_STATIC]
}

function ring(id: string, filter: Filter, radius: number): DrawStyleLayer {
    return { id, type: "circle", filter, paint: { "circle-radius": radius, "circle-color": WHITE } }
}

/**
 * Styles that look like the app's preview geometry layers, so a feature loaded
 * into draw is indistinguishable from one drawn by the layers around it.
 * Layers are ordered as the app stacks them: polygon fill, inner outline and
 * edge, line casing and line, points, then vertices and midpoints.
 */
export function spherePreset({ color, highlightColor, outline, pointRadius }: SpherePresetOptions): DrawStyleLayer[] {
    const strokeWidth = outline ? POINT_STROKE_WIDTH : NO_STROKE_WIDTH
    const polygonStates = [
        { state: "inactive", filter: inactive(POLYGON), paint: color },
        { state: "active", filter: active(POLYGON), paint: highlightColor },
    ] as const
    const lineStates = [
        { state: "inactive", filter: inactive(LINE), paint: color, dash: undefined },
        { state: "active", filter: active(LINE), paint: highlightColor, dash: ACTIVE_DASH },
    ] as const
    const pointStates = [
        { state: "inactive", filter: inactive(POINT, FEATURE_POINT), paint: color },
        { state: "active", filter: active(POINT, FEATURE_POINT), paint: highlightColor },
    ] as const

    const layers: DrawStyleLayer[] = []

    for (const { state, filter, paint } of polygonStates) {
        layers.push({
            id: `sphere-polygon-fill-${state}`,
            type: "fill",
            filter,
            paint: { "fill-color": paint, "fill-opacity": FILL_OPACITY },
        })
    }
    if (outline) {
        for (const { state, filter } of polygonStates) {
            layers.push({
                id: `sphere-polygon-outline-${state}`,
                type: "line",
                filter,
                layout: ROUND_LINE,
                paint: { "line-color": WHITE, "line-width": LINE_WIDTH, "line-offset": INNER_OUTLINE_OFFSET },
            })
        }
    }
    for (const { state, filter, paint } of polygonStates) {
        layers.push({
            id: `sphere-polygon-edge-${state}`,
            type: "line",
            filter,
            layout: ROUND_LINE,
            paint: {
                "line-color": paint,
                "line-width": LINE_WIDTH,
                ...(state === "active" ? { "line-dasharray": ACTIVE_DASH } : {}),
            },
        })
    }
    if (outline) {
        for (const { state, filter } of lineStates) {
            layers.push({
                id: `sphere-line-casing-${state}`,
                type: "line",
                filter,
                layout: ROUND_LINE,
                paint: { "line-color": WHITE, "line-width": CASING_WIDTH },
            })
        }
    }
    for (const { state, filter, paint, dash } of lineStates) {
        layers.push({
            id: `sphere-line-${state}`,
            type: "line",
            filter,
            layout: ROUND_LINE,
            paint: {
                "line-color": paint,
                "line-width": LINE_WIDTH,
                ...(dash ? { "line-dasharray": dash } : {}),
            },
        })
    }
    for (const { state, filter, paint } of pointStates) {
        layers.push({
            id: `sphere-point-${state}`,
            type: "circle",
            filter,
            paint: {
                "circle-radius": pointRadius,
                "circle-color": paint,
                "circle-stroke-color": WHITE,
                "circle-stroke-width": strokeWidth,
            },
        })
    }
    layers.push(
        ring("sphere-vertex-ring", supplementary("vertex"), VERTEX_RING_RADIUS),
        {
            id: "sphere-vertex",
            type: "circle",
            filter: supplementary("vertex"),
            paint: { "circle-radius": VERTEX_RADIUS, "circle-color": highlightColor },
        },
        ring("sphere-midpoint-ring", supplementary("midpoint"), MIDPOINT_RING_RADIUS),
        {
            id: "sphere-midpoint",
            type: "circle",
            filter: supplementary("midpoint"),
            paint: { "circle-radius": MIDPOINT_RADIUS, "circle-color": highlightColor },
        },
    )
    return layers
}
