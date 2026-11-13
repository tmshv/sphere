import type { Position } from "geojson"
import createVertex from "./create_vertex"
import createMidpoint from "./create_midpoint"
import * as Constants from "../constants"
import type { AnyDrawGeometry, DrawGeometry, DrawRenderFeature, DrawRenderProperties } from "../types"

export interface SupplementaryPointsOptions {
    midpoints?: boolean
    selectedPaths?: string[]
}

interface SupplementaryPointsSource {
    properties?: DrawRenderProperties | null
    geometry: AnyDrawGeometry
}

type PointRenderFeature = DrawRenderFeature<DrawGeometry<"Point">>

function createSupplementaryPoints(
    geojson: SupplementaryPointsSource,
    options: SupplementaryPointsOptions = {},
    basePath: string | null = null,
): PointRenderFeature[] {
    const geometry = geojson.geometry
    const featureId = geojson.properties?.id

    let supplementaryPoints: PointRenderFeature[] = []

    if (geometry.type === Constants.geojsonTypes.POINT) {
        // For points, just create a vertex
        supplementaryPoints.push(createVertex(featureId, geometry.coordinates, basePath, isSelectedPath(basePath)))
    } else if (geometry.type === Constants.geojsonTypes.POLYGON) {
        // Cycle through a Polygon's rings and
        // process each line
        for (const [lineIndex, line] of geometry.coordinates.entries()) {
            processLine(line, basePath !== null ? `${basePath}.${lineIndex}` : String(lineIndex))
        }
    } else if (geometry.type === Constants.geojsonTypes.LINE_STRING) {
        processLine(geometry.coordinates, basePath)
    } else {
        processMultiGeometry(geometry)
    }

    function processLine(line: Position[], lineBasePath: string | null) {
        let firstPointString = ""
        let lastVertex: PointRenderFeature | null = null
        for (const [pointIndex, point] of line.entries()) {
            const pointPath = lineBasePath !== null ? `${lineBasePath}.${pointIndex}` : String(pointIndex)
            const vertex = createVertex(featureId, point, pointPath, isSelectedPath(pointPath))

            // If we're creating midpoints, check if there was a
            // vertex before this one. If so, add a midpoint
            // between that vertex and this one.
            if (options.midpoints && lastVertex) {
                const midpoint = createMidpoint(featureId, lastVertex, vertex)
                if (midpoint) {
                    supplementaryPoints.push(midpoint)
                }
            }
            lastVertex = vertex

            // A Polygon line's last point is the same as the first point. If we're on the last
            // point, we want to draw a midpoint before it but not another vertex on it
            // (since we already a vertex there, from the first point).
            const stringifiedPoint = JSON.stringify(point)
            if (firstPointString !== stringifiedPoint) {
                supplementaryPoints.push(vertex)
            }
            if (pointIndex === 0) {
                firstPointString = stringifiedPoint
            }
        }
    }

    function isSelectedPath(path: string | null) {
        if (!options.selectedPaths) return false
        return path !== null && options.selectedPaths.indexOf(path) !== -1
    }

    // Split a multi-geometry into constituent
    // geometries, and accumulate the supplementary points
    // for each of those constituents. The constituent's index is the first
    // segment of its points' paths.
    function processMultiGeometry(multi: Exclude<AnyDrawGeometry, { type: "Point" | "LineString" | "Polygon" }>) {
        const subGeometries = splitMultiGeometry(multi)
        for (const [index, subGeometry] of subGeometries.entries()) {
            const subFeature = {
                type: Constants.geojsonTypes.FEATURE,
                properties: geojson.properties,
                geometry: subGeometry,
            }
            supplementaryPoints = supplementaryPoints.concat(
                createSupplementaryPoints(subFeature, options, String(index)),
            )
        }
    }

    return supplementaryPoints
}

function splitMultiGeometry(
    multi: Exclude<AnyDrawGeometry, { type: "Point" | "LineString" | "Polygon" }>,
): AnyDrawGeometry[] {
    if (multi.type === Constants.geojsonTypes.MULTI_POINT) {
        return multi.coordinates.map(coordinates => ({ type: Constants.geojsonTypes.POINT, coordinates }))
    }
    if (multi.type === Constants.geojsonTypes.MULTI_LINE_STRING) {
        return multi.coordinates.map(coordinates => ({ type: Constants.geojsonTypes.LINE_STRING, coordinates }))
    }
    if (multi.type === Constants.geojsonTypes.MULTI_POLYGON) {
        return multi.coordinates.map(coordinates => ({ type: Constants.geojsonTypes.POLYGON, coordinates }))
    }
    return []
}

export default createSupplementaryPoints
