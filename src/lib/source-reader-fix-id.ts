import { SourceReader } from "./source-reader"

// TODO: make at backend side
export default class SourceReaderFixId extends SourceReader {
    #count: number = 0
    #ID: string = "$id"

    async parse(value: string): Promise<GeoJSON.FeatureCollection> {
        const fc: GeoJSON.FeatureCollection = JSON.parse(value)
        this.fixIds(fc)
        return fc
    }

    #id(): number {
        this.#count ++
        return this.#count
    }

    fixIds(value: GeoJSON.FeatureCollection) {
        for (const f of value.features) {
            if (typeof f.id === "number") {
                continue
            }
            if (!f.properties) {
                f.properties = {}
            }
            f.properties[this.#ID] = f.id
            f.id = this.#id()
        }
    }
}
