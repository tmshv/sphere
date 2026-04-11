import { invoke } from "@tauri-apps/api/core"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"

export async function copySelectionAsGeojson(sourceId: string, wrapFc: boolean): Promise<void> {
    const text = await invoke<string>("selection_copy_geojson", {
        sourceId,
        wrapFc,
    })
    if (text === "") {
        return
    }
    await writeText(text)
}

export async function copySelectionAsWkt(sourceId: string, separator: string): Promise<void> {
    const text = await invoke<string>("selection_copy_wkt", {
        sourceId,
        separator,
    })
    if (text === "") {
        return
    }
    await writeText(text)
}
