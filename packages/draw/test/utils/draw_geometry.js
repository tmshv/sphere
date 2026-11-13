import setupAfterNextRender from "./after_next_render"
import makeMouseEvent from "./make_mouse_event"
import click from "./mouse_click"

const mapFeaturesToModes = {
    Polygon: "draw_polygon",
    Point: "draw_point",
    LineString: "draw_line_string",
}

function toDrawCoordinates(type, coordinates) {
    if (type === "Polygon") return coordinates[0]
    if (type === "Point") return [coordinates]
    return coordinates
}

/**
 * Draws a feature on a map by clicking each coordinate, waiting for a render
 * between clicks. Resolves (and calls the optional callback) when done.
 */
export default async function drawGeometry(map, draw, type, coordinates, cb) {
    const afterNextRender = setupAfterNextRender(map)
    draw.changeMode(mapFeaturesToModes[type])
    for (const point of toDrawCoordinates(type, coordinates)) {
        click(map, makeMouseEvent(point[0], point[1], false))
        await afterNextRender()
    }
    if (cb) cb()
}
