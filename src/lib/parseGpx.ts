import { convertXML } from "simple-xml-to-json"
import { lineString, featureCollection } from "@turf/helpers"

export async function parseGpx(raw: string): Promise<GeoJSON.FeatureCollection | null> {
    try {
        const result = convertXML(raw)
        const pts = result.gpx.children[0].trk.children[1].trkseg.children
        // const points = pts.map((p: any) => {
        //     const lng = parseFloat(p.trkpt.lon)
        //     const lat = parseFloat(p.trkpt.lat)
        //     const ele = parseFloat(p.trkpt.children[0].ele.content)
        //     const time = p.trkpt.children[1].time.content

        //     return point([lng, lat], {
        //         ele,
        //         time,
        //     })
        // })
        const points = pts.map((p: any) => {
            const lng = parseFloat(p.trkpt.lon)
            const lat = parseFloat(p.trkpt.lat)

            return [lng, lat]
        })

        const line = lineString(points)

        return featureCollection([line]) as GeoJSON.FeatureCollection
    } catch (error) {
        return null
    }
}
