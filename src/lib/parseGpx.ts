import { convertXML } from "simple-xml-to-json"
import { lineString } from "@turf/turf"
import { FileParser, SourceType } from "@/types"
import { nextId, nextNumber } from "./nextId"

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

function split<T>(items: T[], predicate: (item: T) => boolean): T[][] {
    const result: T[][] = []
    let buffer: T[] = []

    for (const item of items) {
        if (predicate(item)) {
            result.push(buffer)
            buffer = [item] // add splitter
            // buffer = []
        } else {
            buffer.push(item)
        }
    }

    if (buffer.length > 0) {
        result.push(buffer)
    }

    return result.filter(segment => segment.length > 0)
}

export const parseGpx: FileParser<SourceType.Lines> = async raw => {
    // export async function parseGpx(name: string, location: string, raw: string): Promise<Dataset[] | null> {
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

        // by line segment
        // const lines = zip(init(points), tail(points))
        //     .map(([p0, p1]) => {
        //         const ele = (p0.ele + p1.ele) / 2
        //         const time = p1.time
        //         return lineString([[p0.lng, p0.lat], [p1.lng, p1.lat]], {
        //             ele,
        //             time,
        //         })
        //     })

        // by distance between points
        // const px = zip(init(points), tail(points))
        // const max = 10 * 0.001
        // const segments = split(px, ([p0, p1]) => {
        //     const s = point([p0.lng, p0.lat])
        //     const e = point([p1.lng, p1.lat])
        //     const d = distance(s, e, { units: "kilometers" })
        //     return d > max
        // })
        // const lines = segments.map(segment => {
        //     const points = segment.map(([p, _]) => p)
        //     points.push(last(segment)[1])
        //     const ele = points.map(({ ele }) => ele)
        //     const maxEle = Math.max(...ele)
        //     const minEle = Math.min(...ele)
        //     const averageEle = ele.reduce((acc, x) => acc + x, 0) / ele.length
        //     return lineString(points.map(p => [p.lng, p.lat]), {
        //         maxEle,
        //         minEle,
        //         averageEle,
        //         time: points[0].time,
        //     })
        // })

        const ele = points.map(({ ele }) => ele)
        const maxEle = Math.max(...ele)
        const minEle = Math.min(...ele)
        const averageEle = ele.reduce((acc, x) => acc + x, 0) / ele.length
        const feature = lineString(points.map(p => [p.lng, p.lat]))

        return [
            {
                id: nextId(),
                // name,
                // location,
                type: SourceType.Lines,
                data: [
                    {
                        id: nextNumber(),
                        geometry: feature.geometry,
                        data: {
                            maxEle,
                            minEle,
                            averageEle,
                        },
                        meta: {},
                    },
                ],
            },
            {
                pointsCount: 0,
                linesCount: 1,
                polygonsCount: 0,
            },
        ]
    } catch (error) {
        throw new Error("Failed to read GPX file")
    }
}
