import { listen } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { getVersion } from "@tauri-apps/api/app"
import { actions, store } from "@/store"
import { sleep } from "@/lib/time"

export async function handleHotkey() {
    // await register('CommandOrControl+Shift+C', () => {
    // let hotkey = ""

    // hotkey = 'CommandOrControl+Z'
    // if (!await isRegistered(hotkey)) {
    //   await register('CommandOrControl+Z', () => {
    //     console.log('undo');
    //     store.dispatch(actions.undo())
    //   })
    // }

    // hotkey = 'CommandOrControl+Shift+Z'
    // if (!await isRegistered(hotkey)) {
    //   await register('CommandOrControl+Shift+Z', () => {
    //     console.log('redo');
    //     store.dispatch(actions.redo())
    //   })
    // }
}

export async function handleTheme() {
    const w = getCurrentWindow()
    const theme = await w.theme()
    if (theme) {
        store.dispatch(actions.app.setDarkTheme(theme === "dark"))
    }

    // const unlisten =
    await listen("tauri://theme-changed", (event) => {
        const theme = event.payload as string
        store.dispatch(actions.app.setDarkTheme(theme === "dark"))
    })
}

export async function handleVersion() {
    const version = await getVersion()
    store.dispatch(actions.app.setVersion(version))
}

export async function handleDragDrop() {
    const e = "tauri://drag-drop"
    // const e = "tauri://file-drop-hover"
    // const e = "tauri://file-drop-cancelled"

    type DragPayload = {
        paths: string[]
    }

    // const unlisten =
    await listen<DragPayload>(e, (event) => {
        store.dispatch(actions.addMultipleFiles(event.payload.paths))
    })
}

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
