import type { AddProtocolAction } from "maplibre-gl"
import { MbtilesReader } from "./mbtiles"
import { SourceReader } from "./source-reader"

export class SphereProtocol {
    public get name() {
        return "sphere"
    }

    public parseZXY(url: URL): [number, number, number] {
        const z = url.searchParams.get("z") ?? "0"
        const x = url.searchParams.get("x") ?? "0"
        const y = url.searchParams.get("y") ?? "0"
        return [Number.parseInt(z, 10), Number.parseInt(x, 10), Number.parseInt(y, 10)]
    }

    public createHandler(): AddProtocolAction {
        return async (params, _abort) => {
            const url = new URL(params.url)
            const id = url.host
            const path = url.pathname
            switch (path) {
                case "/tilejson": {
                    const reader = new MbtilesReader(id)
                    const tilejson = await reader.getTileJson()
                    if (!tilejson) throw new Error(`No TileJSON for source ${id}`)
                    return { data: tilejson }
                }
                case "/tile": {
                    const reader = new MbtilesReader(id)
                    const [z, x, y] = this.parseZXY(url)
                    const bytes = await reader.getTile({ z, x, y })
                    // MapLibre treats an empty response as a tile with no data.
                    // A fresh buffer per tile: MapLibre may transfer it to a worker.
                    if (!bytes) return { data: new ArrayBuffer(0) }
                    return { data: bytes.buffer }
                }
                default: {
                    const reader = new SourceReader(id)
                    const geojson = await reader.getGeojson()
                    if (!geojson) throw new Error(`No GeoJSON for source ${id}`)
                    return { data: geojson }
                }
            }
        }
    }
}
