import { once } from "@/lib/once"
import { listen } from "@tauri-apps/api/event"

export function waitEvent<T>(event: string, timeout?: number): Promise<T> {
    return once<T>(handler => listen<T>(event, e => handler(e.payload)), {
        timeout,
        label: `event: ${event}`,
    })
}
