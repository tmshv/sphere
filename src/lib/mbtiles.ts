import { invoke } from "@tauri-apps/api"

type Tile = {
    z: number
    x: number
    y: number
}
type TileJSON = Record<string, string | number>

export class MbtilesReader {
    constructor(public path: string) {
    }

    public async getMetadata(): Promise<TileJSON | null> {
        const res = await invoke<string>("mbtiles_get_metadata", {
            path: this.path,
        })

        try {
            return JSON.parse(res)
        } catch (error) {
            return null
        }
    }

    public async getTile({ z, x, y }: Tile): Promise<Uint8Array | null> {
        const res = await invoke<number[]>("mbtiles_get_tile", {
            path: this.path,
            z,
            x,
            y,
        })
        if (!res || res.length === 0) {
            return null
        }

        return Uint8Array.from(res)
    }
}

