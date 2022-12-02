import { listen } from "@tauri-apps/api/event"
import { sleep } from "./time"

export async function waitEvent<T>(event: string): Promise<T> {
    let wait = true
    let payload: T | undefined = undefined
    const unlisten = await listen<T>(event, e => {
        wait = false
        payload = e.payload
    })

    while (wait) {
        await sleep(0)
    }

    unlisten()

    return payload as T
}
