import type { RequestParameters, ResponseCallback } from "maplibre-gl"
import { MbtilesReader } from "./mbtiles"

export class SphereProtocol {
    constructor() {
    }

    public get name() {
        return "sphere"
    }

    public async handleMbtiles(reader: MbtilesReader, url: URL, type: "json" | "arrayBuffer" | "string" | undefined) {
        switch (type) {
            case "json": {
                return reader.getMetadata()
            }
            case "arrayBuffer": {
                const z = parseInt(url.searchParams.get("z")!)
                const x = parseInt(url.searchParams.get("x")!)
                const y = parseInt(url.searchParams.get("y")!)

                const pbf = await reader.getTile({ z, x, y })
                if (!pbf) {
                    return null
                }

                console.log("TILE", pbf.buffer)

                return pbf.buffer
            }
            default: {
                throw new Error(`SphereProtocol for ${url.host}/${type} is not implemented`)
            }
        }
    }

    public createHandler() {
        const run = async (params: RequestParameters) => {
            const url = new URL(params.url)
            // console.log("sphere protocol", url)

            switch (url.host) {
                case "mbtiles": {
                    const reader = new MbtilesReader(url.pathname)
                    return this.handleMbtiles(reader, url, params.type)
                }
                default: {
                    throw new Error(`SphereProtocol for ${url.host} is not implemented`)
                }
            }

            // const url = this.buildHttpUrl(params.url)
            // if (!url) {
            //     throw new Error(`Not valid mapbox:// url (${params.url})`)
            // }
            //
            // const res = await fetch(url, {
            //     headers: {
            //         ...params.headers,
            //     },
            // })
            // if (!res.ok) {
            //     throw new Error(`fetch error: ${res.statusText}`)
            // }
            //
            // switch (params.type) {
            //     case "json": {
            //         return res.json()
            //     }
            //     case "arrayBuffer": {
            //         return res.arrayBuffer()
            //     }
            //     case "string": {
            //         return res.text()
            //     }
            // }
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
