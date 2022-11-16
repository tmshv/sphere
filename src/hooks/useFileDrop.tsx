import { listen } from '@tauri-apps/api/event'
import { readTextFile } from "@tauri-apps/api/fs"
import { useEffect, useState } from "react";
import { parseGeojson } from '../lib/parseGeojson';
import { parseGpx } from '../lib/parseGpx';

const parsers = new Map([
    ["json", parseGeojson],
    ["geojson", parseGeojson],
    ["gpx", parseGpx],
])

function getExt(path: string): string {
    const x = path.split(".")
    return x[x.length - 1]
}

export function useFileDrop(): GeoJSON.FeatureCollection | null {
    const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

    useEffect(() => {
        const e = "tauri://file-drop"
        // const e = "tauri://file-drop-hover"
        // const e = "tauri://file-drop-cancelled"

        // const unlisten = await listen(e, (event) => {
        //     console.log(e, event)
        // })
        listen(e, async (event) => {
            const files = event.payload as string[]
            const file = files[0]

            const ext = getExt(file)
            if (!parsers.has(ext)) {
                return null
            }
            const parser = parsers.get(ext)!

            const raw = await readTextFile(file)
            const fc = await parser(raw)
            setGeojson(fc)
        })

    }, [])

    return geojson
}
