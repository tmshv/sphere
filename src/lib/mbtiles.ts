import { TileJSON } from "@/types/tilejson"
import { invoke } from "@tauri-apps/api"

type Tile = {
    z: number
    x: number
    y: number
}

export class MbtilesReader {
    constructor(public location: string) {
    }

    private getId(): string {
        const url = new URL(this.location)
        return url.pathname.substring(1)
    }

    public async getTileJson(): Promise<TileJSON | null> {
        try {
            const res = await invoke<string>("mbtiles_get_metadata", {
                id: this.getId(),
            })
            return this.parse(res)
        } catch (error) {
            return null
        }
    }

    public async getTile({ z, x, y }: Tile): Promise<Uint8Array | null> {
        const res = await invoke<number[]>("mbtiles_get_tile", {
            id: this.getId(),
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
        return (new Response(value)).json()
    }
}
