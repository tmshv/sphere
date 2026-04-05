import { listen } from "@tauri-apps/api/event"

export function waitEvent<T>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout> | undefined
        const unlistenPromise = listen<T>(event, e => {
            if (timer) {
                clearTimeout(timer)
            }
            unlistenPromise.then(fn => fn())
            resolve(e.payload)
        })
        unlistenPromise.catch(reject)
        if (timeout) {
            timer = setTimeout(() => {
                unlistenPromise.then(fn => fn())
                reject(new Error(`Timeout waiting for event: ${event}`))
            }, timeout)
        }
    })
}
