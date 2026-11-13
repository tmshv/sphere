import type { Position } from "geojson"
import type DrawApi from "../api"
import * as Constants from "../constants"
import setupAfterNextRender from "./after_next_render"
import type Evented from "./evented"
import makeMouseEvent from "./make_mouse_event"
import click from "./mouse_click"

/** The geometry type to draw and its GeoJSON coordinates, plus an optional callback for when it is drawn. */
export type DrawGeometryArgs =
    | [type: "Point", coordinates: Position, cb?: () => void]
    | [type: "LineString", coordinates: Position[], cb?: () => void]
    | [type: "Polygon", coordinates: Position[][], cb?: () => void]

/** The positions to click, in order: the outer ring of a polygon, closing position included. */
function toDrawCoordinates(args: DrawGeometryArgs): Position[] {
    const [type, coordinates] = args
    if (type === "Polygon") return coordinates.at(0) ?? []
    if (type === "Point") return [coordinates]
    return coordinates
}

const MODES: Record<DrawGeometryArgs[0], string> = {
    Polygon: Constants.modes.DRAW_POLYGON,
    Point: Constants.modes.DRAW_POINT,
    LineString: Constants.modes.DRAW_LINE_STRING,
}

/**
 * Draws a feature on a map by clicking each coordinate, waiting for a render
 * between clicks. Resolves (and calls the optional callback) when done.
 */
export default async function drawGeometry(
    map: Evented,
    draw: Pick<DrawApi, "changeMode">,
    ...args: DrawGeometryArgs
): Promise<void> {
    const [type, , cb] = args
    const afterNextRender = setupAfterNextRender(map)
    draw.changeMode(MODES[type])
    for (const [x, y] of toDrawCoordinates(args)) {
        click(map, makeMouseEvent(x, y))
        await afterNextRender()
    }
    if (cb) cb()
}
