import type { AddProtocolAction } from "maplibre-gl"
import { MbtilesReader } from "./mbtiles"
import { SourceReader } from "./source-reader"

type RequestType = "json" | "arrayBuffer" | "string" | "image" | undefined

export class SphereProtocol {
    public get name() {
        return "sphere"
    }

    public parseZXY(url: URL): [number, number, number] {
        const z = url.searchParams.get("z") ?? "0"
        const x = url.searchParams.get("x") ?? "0"
        const y = url.searchParams.get("y") ?? "0"
        return [Number.parseInt(z), Number.parseInt(x), Number.parseInt(y)]
    }

    public async handleMbtiles(reader: MbtilesReader, url: URL, type: RequestType, _sig: AbortSignal) {
        switch (type) {
            case "json": {
                return reader.getTileJson()
            }
            case "arrayBuffer":
            case "image": {
                const [z, x, y] = this.parseZXY(url)
                const bytes = await reader.getTile({ z, x, y })
                if (!bytes) {
                    return null
                }
                return bytes.buffer
            }
            default: {
                throw new Error(`SphereProtocol for ${url.host}/${type} is not implemented`)
            }
        }
    }

    public async handleSource(reader: SourceReader, type: RequestType, _sig: AbortSignal) {
        switch (type) {
            case "json": {
                return reader.getGeojson()
            }
            default: {
                throw new Error(`SphereProtocol for ${type} is not implemented`)
            }
        }
    }

    public createHandler(): AddProtocolAction {
        return async (params, abort) => {
            const url = new URL(params.url)
            switch (url.host) {
                case "mbtiles": {
                    const id = url.pathname.substring(1)
                    const reader = new MbtilesReader(id)
                    const data = await this.handleMbtiles(reader, url, params.type, abort.signal)
                    return { data }
                }
                case "source": {
                    const id = url.pathname.substring(1)
                    const reader = new SourceReader(id)
                    const data = await this.handleSource(reader, params.type, abort.signal)
                    return { data }
                }
                default: {
                    throw new Error(`SphereProtocol for ${url.host} is not implemented`)
                }
            }
        }
    }
}
