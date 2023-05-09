import logger from "@/logger"
import type { RequestParameters, ResponseCallback } from "maplibre-gl"

export function insertBefore(value: string, match: string, prefix: string): string {
    const i = value.indexOf(match)
    if (i !== -1) {
        const replaced = prefix + value.substring(i)
        return value.substring(0, i) + replaced
    }
    return value // No @ symbol found, return original string
}

// this will fetch a file using the fetch API (this is obviously a non iteresting example...)
export class MapboxProtocol {
    constructor(public accessToken: string) {
    }

    public get name() {
        return "mapbox"
    }

    public buildHttpUrl(value: string): string | null {
        // mapbox://mapbox.satellite
        // mapbox://mapbox.mapbox-terrain-v2,mapbox.mapbox-streets-v7
        const regexp1 = /mapbox:\/\/(mapbox)\.([\w\d-_.,]+?)$/
        let m = regexp1.exec(value)
        if (m) {
            const [_, resourceOwner, resourceName] = m
            const ext = "json"
            return `https://api.mapbox.com/v4/${resourceOwner}.${resourceName}.${ext}?secure&access_token=${this.accessToken}`
        }

        // mapbox://styles/mapbox/satellite-streets-v11
        // mapbox://fonts/mapbox/DIN Offc Pro Medium,Arial Unicode MS Regular/0-255.pbf
        const regex2 = /mapbox:\/\/(styles|fonts)\/([\w\d-_]+?)\/(.*?)$/
        m = regex2.exec(value)
        if (m) {
            const [_, resourceType, resourceOwner, resourceName] = m
            return `https://api.mapbox.com/${resourceType}/v1/${resourceOwner}/${resourceName}?access_token=${this.accessToken}`
        }

        // mapbox://sprites/mapbox/satellite-streets-v11
        const regex3 = /mapbox:\/\/sprites\/([\w\d-_]+?)\/(.*?)$/
        m = regex3.exec(value)
        if (m) {
            const [_, resourceOwner, resourceName] = m

            // transform original name
            // satellite-streets-v11@2x.json
            // to this:
            // satellite-streets-v11/sprite@2x.json
            const name = insertBefore(resourceName, "@", "/sprite")

            // https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v11/sprite@2x.json?access_token=...
            return `https://api.mapbox.com/styles/v1/${resourceOwner}/${name}?access_token=${this.accessToken}`
        }

        return null
    }

    public createHandler() {
        const run = async (params: RequestParameters) => {
            const url = this.buildHttpUrl(params.url)
            if (!url) {
                throw new Error(`Not valid mapbox:// url (${params.url})`)
            }

            const res = await fetch(url, {
                headers: {
                    ...params.headers,
                },
            })
            if (!res.ok) {
                throw new Error(`fetch error: ${res.statusText}`)
            }

            switch (params.type) {
                case "json": {
                    return res.json()
                }
                case "arrayBuffer": {
                    return res.arrayBuffer()
                }
                case "string": {
                    return res.text()
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
