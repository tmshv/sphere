import { listen } from '@tauri-apps/api/event'
import { readTextFile } from "@tauri-apps/api/fs"
import { useEffect, useState } from "react";

function isFeatureCollection(json: any): boolean {
    return true
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
            const datas = await Promise.all(files.map(x => readTextFile(x)))

            const d = datas[0]

            try {
                const gis = JSON.parse(d)
                if (isFeatureCollection(gis)) {
                    setGeojson(gis)
                } else {
                }
            } catch (error) {

            }
        })

    }, [])

    return geojson
}
