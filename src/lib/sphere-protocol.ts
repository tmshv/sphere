import type { AddProtocolAction } from "maplibre-gl"
import { MbtilesReader } from "./mbtiles"
import { SourceReader } from "./source-reader"
import logger from "@/logger"

type RequestType = "json" | "arrayBuffer" | "string" | "image" | undefined

export class SphereProtocol {
    constructor() {
    }

    public get name() {
        return "sphere"
    }

    public parseZXY(url: URL): [number, number, number] {
        const z = url.searchParams.get("z") ?? "0"
        const x = url.searchParams.get("x") ?? "0"
        const y = url.searchParams.get("y") ?? "0"
        return [
            parseInt(z),
            parseInt(x),
            parseInt(y),
        ]
    }

    public async handleMbtiles(reader: MbtilesReader, url: URL, type: RequestType, sig: AbortSignal) {
        switch (type) {
            case "json": {
                return reader.getTileJson()
            }
            case "arrayBuffer": {
                const [z, x, y] = this.parseZXY(url)
                const pbf = await reader.getTile({ z, x, y })
                if (!pbf) {
                    return null
                }
                return pbf.buffer
            }
            default: {
                throw new Error(`SphereProtocol for ${url.host}/${type} is not implemented`)
            }
        }
    }

    public async handleSource(reader: SourceReader, type: RequestType, sig: AbortSignal) {
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
            logger.info("sphere protocol got params", params)
            const url = new URL(params.url)
            switch (url.host) {
                case "mbtiles": {
                    const reader = new MbtilesReader(params.url)
                    const data = await this.handleMbtiles(reader, url, params.type, abort.signal)
                    return { data }
                }
                case "source": {
                    const reader = new SourceReader(params.url)
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
