import type { TileJSON } from "@/types/tilejson"
import { invoke } from "@tauri-apps/api/core"

type Tile = {
    z: number
    x: number
    y: number
}

export class MbtilesReader {
    constructor(private id: string) {}

    public async getTileJson(): Promise<TileJSON | null> {
        try {
            const res = await invoke<string>("mbtiles_get_metadata", {
                id: this.id,
            })
            return this.parse(res)
        } catch (_error) {
            return null
        }
    }

    public async getTile({ z, x, y }: Tile): Promise<Uint8Array | null> {
        const res = await invoke<number[]>("mbtiles_get_tile", {
            id: this.id,
            z,
            x,
            y,
        })
        if (!res || res.length === 0) {
            return null
        }

        return Uint8Array.from(res)
    }

    async parse(value: string) {
        return new Response(value).json()
    }
}
