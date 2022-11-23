import * as Papa from "papaparse"
import { featureCollection, point } from "@turf/turf"
import { FileParser } from "@/types"
import { nextNumber } from "./nextId"

export const parseCsv: FileParser = async raw => {
    const results = Papa.parse<any>(raw, {
        header: true,
    })

    const features = results.data
        .filter(row => {
            return !!row.lng && !!row.lat
        })

    return [
        featureCollection(
            features.map(row => {
                const feature = point([parseFloat(row.lng), parseFloat(row.lat)], { ...row })
                feature.id = nextNumber()
                return feature
            }),
        ),
        {
            pointsCount: features.length,
            linesCount: 0,
            polygonsCount: 0,
        }
    ]
}
