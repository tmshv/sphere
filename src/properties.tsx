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
    }, [eventName])

    return payload
}

const useStyle = createStyles(() => ({
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
    },
}))

const columnHelper = createColumnHelper<PropertyItem>()

type PropertiesSetPayload = {
    properties: { id: GeoJSON.Feature["id"], props: GeoJSON.GeoJsonProperties }[];
};

function useData(): [ColumnDef<PropertyItem>[], Record<string, PropertyItemMeta>, PropertyItem[]] | undefined {
    const data = useEvent<PropertiesSetPayload>("properties-set")
    if (!data) {
        return undefined
    }

    const rows: PropertyItem[] = data.properties.map(item => ({ $id: item.id, ...item.props }))
    const head = Object.keys(data.properties[0].props ?? {})

    const columns: ColumnDef<PropertyItem>[] = [
        columnHelper.accessor("$id", {
            id: "$id",
            cell: (info) => info.getValue(),
            header: () => <span>$id</span>,
        }),
        ...head.map((key) =>
            columnHelper.accessor(key, {
                id: key,
                cell: (info) => info.getValue(),
                header: () => <span>{key}</span>,
            }),
        ),
    ]

    const meta: Record<string, PropertyItemMeta> = {
        $id: { type: "unknown" },
    }

    head.reduce((acc, key) => {
        const bins = 11
        const type = predictType(key, rows)
        switch (type) {
            case "string": {
                const unique = new Set(rows.map((p) => p[key]))
                acc[key] = {
                    type,
                    unique: unique.size,
                }
                break
            }
            case "int": {
                const n = rows.map((p) => parseFloat(p[key]))
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
                const n = rows.map((p) => parseFloat(p[key]))
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
    }, meta)

    return [columns, meta, rows]
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
