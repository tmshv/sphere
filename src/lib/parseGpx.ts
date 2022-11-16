import { convertXML } from "simple-xml-to-json"
import { point, lineString, featureCollection } from "@turf/helpers"

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

            return point([lng, lat], {
                ele,
                time,
            })
        })
        const line = lineString(pts.map(p => {
            const lng = parseFloat(p.trkpt.lon)
            const lat = parseFloat(p.trkpt.lat)

            return [lng, lat]
        }))

        return featureCollection([line as any, ...points]) as GeoJSON.FeatureCollection
    } catch (error) {
        return null
    }
}
