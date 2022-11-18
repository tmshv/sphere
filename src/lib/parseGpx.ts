import { convertXML } from "simple-xml-to-json"
import { lineString, featureCollection } from "@turf/helpers"
import { init, tail, zip } from "./array"

type Gpx = {
    gpx: {
        children: Trk[]
    }
}

type Trk = {
    trk: {
        children: Trkseg[]
    }
}

type Trkseg = {
    trkseg: {
        children: Trkpt[]
    }
}

type Trkpt = {
    trkpt: {
        lat: string
        lon: string
        children: [Ele, Time]
    }
}

type Ele = {
    ele: {
        content: string
    }
}

type Time = {
    time: {
        content: string
    }
}

export async function parseGpx(raw: string): Promise<GeoJSON.FeatureCollection | null> {
    try {
        const result = convertXML<Gpx>(raw)
        const pts = result.gpx.children[0].trk.children[1].trkseg.children
        const points = pts.map(p => {
            const lng = parseFloat(p.trkpt.lon)
            const lat = parseFloat(p.trkpt.lat)
            const ele = parseFloat(p.trkpt.children[0].ele.content)
            const time = p.trkpt.children[1].time.content

            return {
                lng,
                lat,
                ele,
                time,
            }
        })

        // const lines = zip(init(points), tail(points))
        //     .map(([p0, p1]) => {
        //         const ele = (p0.ele + p1.ele) / 2
        //         const time = p1.time

        //         return lineString([[p0.lng, p0.lat], [p1.lng, p1.lat]], {
        //             ele,
        //             time,
        //         })
        //     })

        const ele = points.map(({ ele }) => ele)
        const maxEle = Math.max(...ele)
        const minEle = Math.min(...ele)
        const averageEle = ele.reduce((acc, x) => acc + x, 0) / ele.length

        const lines = [
            lineString(points.map(p => [p.lng, p.lat]), {
                maxEle,
                minEle,
                averageEle,
                time: points[0].time,
            })
        ]

        return featureCollection(lines) as GeoJSON.FeatureCollection
    } catch (error) {
        return null
    }
}
