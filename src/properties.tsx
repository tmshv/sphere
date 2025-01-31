import "./style.css"

import { emit, listen, UnlistenFn } from "@tauri-apps/api/event"
import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import { createColumnHelper, ColumnDef } from "@tanstack/react-table"
import { Box, createStyles } from "@mantine/core"
import { ThemeProvider } from "./ui/ThemeProvider"
import { PropertesTable, PropertyItem, PropertyItemMeta } from "./ui/PropertiesTable"
import { hist } from "./lib/stat"
import { predictType } from "@/lib/predict-data-type"

function useEvent<T>(eventName: string) {
    const [payload, setPayload] = useState<T | undefined>(undefined)

    useEffect(() => {
        let stop: UnlistenFn | undefined = undefined
        const fn = async () => {
            stop = await listen<T>(eventName, (event) => {
                setPayload(event.payload)
            })
        }

        fn()

        return () => {
            if (typeof stop === "function") {
                stop()
            }
        }
    }, [])

    return payload
}

const useStyle = createStyles((theme) => ({
    container: {
        overflowX: "auto",
        height: "100%",

        padding: theme.spacing.sm,

        touchAction: "none",
    },
}))

const columnHelper = createColumnHelper<PropertyItem>()

type PropertiesSetPayload = {
    properties: PropertyItem[];
};

function useData(): [ColumnDef<PropertyItem>[], Record<string, PropertyItemMeta>, PropertyItem[]] | undefined {
    const data = useEvent<PropertiesSetPayload>("properties-set")
    if (!data) {
        return undefined
    }

    const head = Object.keys(data.properties[0])
    const columns = head.map((key) =>
        columnHelper.accessor(key, {
            id: key,
            cell: (info) => info.getValue(),
            header: () => <span>{key}</span>,
        }),
    )

    const meta = head.reduce((acc, key) => {
        const bins = 11
        const type = predictType(key, data.properties)
        switch (type) {
            case "string": {
                const unique = new Set(data.properties.map((p) => p[key]))
                acc[key] = {
                    type,
                    unique: unique.size,
                }
                break
            }
            case "int": {
                const n = data.properties.map((p) => parseFloat(p[key]))
                const min = Math.min(...n)
                const max = Math.max(...n)
                const mean = 0
                acc[key] = {
                    type,
                    min,
                    max,
                    mean,
                    hist: !isNaN(max) && !isNaN(min) ? hist(n, bins) : undefined,
                }
                break
            }
            case "float": {
                const n = data.properties.map((p) => parseFloat(p[key]))
                const min = Math.min(...n)
                const max = Math.max(...n)
                const mean = 0
                acc[key] = {
                    type,
                    min,
                    max,
                    mean,
                    hist: !isNaN(max) && !isNaN(min) ? hist(n, bins) : undefined,
                }
                break
            }
            default: {
                acc[key] = {
                    type,
                }
                break
            }
        }
        return acc
    }, {} as Record<string, PropertyItemMeta>)

    return [columns, meta, data.properties]
}

const View: React.FC = () => {
    const def = useData()
    if (!def) {
        return null
    }

    const [columns, meta, data] = def

    return <PropertesTable columns={columns} meta={meta} data={data} />
}

const App: React.FC = () => {
    const { classes: s } = useStyle()

    useEffect(() => {
        emit("properties-init", {})
    }, [])

    return (
        <Box className={s.container}>
            <View />
        </Box>
    )
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        {/* <Provider store={store}> */}
        <ThemeProvider dark={false}>
            <App />
        </ThemeProvider>
        {/* </Provider> */}
    </React.StrictMode>,
)
