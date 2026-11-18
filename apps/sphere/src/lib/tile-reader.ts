import type { TileJSON } from "@/types/tilejson"
import { invoke } from "@tauri-apps/api/core"

type Tile = {
    z: number
    x: number
    y: number
}

export class TileReader {
    constructor(private id: string) {}

    public async getTileJson(): Promise<TileJSON | null> {
        try {
            const res = await invoke<string>("tiles_get_tilejson", {
                id: this.id,
            })
            return this.parse(res)
        } catch (_error) {
            return null
        }
    }

    public async getTile({ z, x, y }: Tile): Promise<Uint8Array | null> {
        const res = await invoke<number[]>("tiles_get_tile", {
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
