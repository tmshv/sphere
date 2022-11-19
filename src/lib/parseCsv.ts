import * as Papa from "papaparse"
import { point, featureCollection } from "@turf/turf"

export async function parseCsv<T = GeoJSON.FeatureCollection>(raw: string): Promise<T | null> {
    const results = Papa.parse<any>(raw, {
        header: true,
    })

    const features = results.data
        .filter(row => {
            return !!row.lng && !!row.lat
        })
        .map(row => {
            return point([parseFloat(row.lng), parseFloat(row.lat)], {
                ...row,
            })
        })

    return featureCollection(features) as T
}
