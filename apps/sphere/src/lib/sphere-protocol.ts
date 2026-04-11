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
                    return { data: await reader.getTileJson() }
                }
                case "/tile": {
                    const reader = new MbtilesReader(id)
                    const [z, x, y] = this.parseZXY(url)
                    const bytes = await reader.getTile({ z, x, y })
                    if (!bytes) return { data: null }
                    return { data: bytes.buffer }
                }
                default: {
                    const reader = new SourceReader(id)
                    return { data: await reader.getGeojson() }
                }
            }
        }
    }
}
