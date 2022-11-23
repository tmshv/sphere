import * as Papa from "papaparse"
import { point } from "@turf/turf"
import { FileParser, SourceType } from "@/types"
import { nextId, nextNumber } from "./nextId"

export const parseCsv: FileParser<SourceType.Points> = async raw => {
    const results = Papa.parse<any>(raw, {
        header: true,
    })

    const features = results.data
        .filter(row => {
            return !!row.lng && !!row.lat
        })

    return [
        {
            id: nextId(),
            // name,
            // location,
            data: features.map(row => {
                const feature = point([parseFloat(row.lng), parseFloat(row.lat)])
                return {
                    id: nextNumber(),
                    geometry: feature.geometry,
                    data: row,
                    meta: {},
                }
            }),
            type: SourceType.Points,
        },
        {
            pointsCount: features.length,
            linesCount: 0,
            polygonsCount: 0,
        }
    ]
}
