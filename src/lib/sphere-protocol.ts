import type { RequestParameters, ResponseCallback } from "maplibre-gl"
import { MbtilesReader } from "./mbtiles"
import { ShapeReader } from "./shape"

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

    public async handleMbtiles(reader: MbtilesReader, url: URL, type: "json" | "arrayBuffer" | "string" | undefined) {
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

    public async handleShape(reader: ShapeReader, url: URL, type: "json" | "arrayBuffer" | "string" | undefined) {
        switch (type) {
            case "json": {
                return reader.getGeojson()
            }
            default: {
                throw new Error(`SphereProtocol for ${url.host}/${type} is not implemented`)
            }
        }
    }

    public createHandler() {
        const run = async (params: RequestParameters) => {
            const url = new URL(params.url)
            switch (url.host) {
                case "mbtiles": {
                    const reader = new MbtilesReader(url.pathname)
                    return this.handleMbtiles(reader, url, params.type)
                }
                case "shape": {
                    const reader = new ShapeReader(url.pathname)
                    return this.handleShape(reader, url, params.type)
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
                    console.log("canceling", params)
                },
            }
        }
    }
}
