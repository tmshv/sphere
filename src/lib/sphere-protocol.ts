import type { RequestParameters, ResponseCallback } from "maplibre-gl"
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

    public async handleMbtiles(reader: MbtilesReader, url: URL, type: RequestType) {
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

    public async handleSource(reader: SourceReader, type: RequestType) {
        switch (type) {
            case "json": {
                return reader.getGeojson()
            }
            default: {
                throw new Error(`SphereProtocol for ${type} is not implemented`)
            }
        }
    }

    public createHandler() {
        const run = async (params: RequestParameters) => {
            const url = new URL(params.url)
            switch (url.host) {
                case "mbtiles": {
                    logger.info("handle mbtiles", url)
                    const reader = new MbtilesReader(params.url)
                    return this.handleMbtiles(reader, url, params.type)
                }
                case "source": {
                    const reader = new SourceReader(params.url)
                    return this.handleSource(reader, params.type)
                }
                default: {
                    throw new Error(`SphereProtocol for ${url.host} is not implemented`)
                }
            }
        }

        return (params: RequestParameters, callback: ResponseCallback<any>) => {
            run(params)
                .then(data => {
                    callback(null, data, null, null)
                })
                .catch(error => {
                    callback(error, null, null, null)
                })

            return {
                cancel: () => {
                    logger.debug("Not Implemented. Cancelling protocol request", params)
                },
            }
        }
    }
}
