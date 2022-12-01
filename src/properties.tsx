import "./style.css";

import { emit, listen, UnlistenFn } from "@tauri-apps/api/event";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
;// emit an event that are only visible to the current window
// appWindow.emit('event', { message: 'Tauri is awesome!' })// emit an event that are only visible to the current window
// appWindow.emit('event', { message: 'Tauri is awesome!' }) from "react-dom/client";
import { appWindow, WebviewWindow } from '@tauri-apps/api/window'
import { Table } from "@mantine/core";

function useEvent<T>(eventName: string) {
    const [payload, setPayload] = useState<T | undefined>(undefined)

    useEffect(() => {
        let stop: UnlistenFn | undefined = undefined
        const fn = async () => {
            stop = await listen<T>(eventName, event => {
                setPayload(event.payload)
            })
        }

        fn()

        return () => {
            if (typeof stop === 'function') {
                stop()
            }
        }
    }, [])

    return payload
}

type PropertiesSetPayload = {
    properties: Record<string, any>[]
}

function useData(): [string[], Record<string, any>[]] | undefined {
    const data = useEvent<PropertiesSetPayload>("properties-set")
    if (!data) {
        return undefined
    }

    console.log("got", data)

    const head = Object.keys(data.properties[0])
    return [head, data.properties]
}

const App: React.FC = () => {
    useEffect(() => {
        emit("properties-init", { message: "lalala-" + Date.now() })
    }, [])

    return (
        <View />
    )
}
const View: React.FC = () => {
    const data = useData()
    if (!data) {
        return null
    }

    const [head, rows] = data

    return (
        <Table>
            <thead>
                <tr>
                    {head.map((key, i) => (
                        <th key={i}>{key}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i}>
                        {head.map((key, i) => (
                            <td key={i}>{row[key]}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

// async function main() {
//     await emit("properties-init", { kek: 1 })
// }

// main()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App></App>
        {/* <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider> */}
    </React.StrictMode>
);
