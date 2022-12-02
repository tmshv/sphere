import "./style.css";

import { emit, listen, UnlistenFn } from "@tauri-apps/api/event";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { createColumnHelper, ColumnDef } from '@tanstack/react-table'
import { Box, createStyles } from "@mantine/core";
import { ThemeProvider } from "./ui/ThemeProvider";
import { PropertesTable, PropertyItem } from "./ui/PropertiesTable";

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

const useStyle = createStyles(theme => ({
    container: {
        overflowX: 'auto',
        height: '100%',

        marginLeft: theme.spacing.md,
        marginRight: theme.spacing.md,
        marginBottom: theme.spacing.md,

        userSelect: 'none',
        touchAction: 'none',
    },
}))

const columnHelper = createColumnHelper<PropertyItem>()

type PropertiesSetPayload = {
    properties: PropertyItem[]
}

function useData(): [ColumnDef<PropertyItem>[], PropertyItem[]] | undefined {
    const data = useEvent<PropertiesSetPayload>("properties-set")
    if (!data) {
        return undefined
    }

    const head = Object.keys(data.properties[0])
    const columns = head.map(key => columnHelper.accessor(key, {
        id: key,
        cell: info => info.getValue(),
        header: () => <span>{key}</span>,
    }))

    return [columns, data.properties]
}

const View: React.FC = () => {
    const def = useData()
    if (!def) {
        return null
    }

    return (
        <PropertesTable
            columns={def[0]}
            data={def[1]}
        />
    )
}

const App: React.FC = () => {
    const { classes: s } = useStyle()

    useEffect(() => {
        emit("properties-init", { message: "lalala-" + Date.now() })
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
    </React.StrictMode>
);
