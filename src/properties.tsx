import "./style.css";

import { emit, listen, UnlistenFn } from "@tauri-apps/api/event";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { useReactTable, createColumnHelper, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table'
    ;// emit an event that are only visible to the current window
// appWindow.emit('event', { message: 'Tauri is awesome!' })// emit an event that are only visible to the current window
// appWindow.emit('event', { message: 'Tauri is awesome!' }) from "react-dom/client";
import { appWindow, WebviewWindow } from '@tauri-apps/api/window'
import { Table } from "@mantine/core";

type PropertyItem = Record<string, any>

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
        cell: info => <i>{info.getValue()}</i>,
        header: () => <span>{key}</span>,
    }))
    // const columns = [
    // columnHelper.accessor('firstName', {
    //     cell: info => info.getValue(),
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor(row => row.lastName, {
    //     id: 'lastName',
    //     cell: info => <i>{info.getValue()}</i>,
    //     header: () => <span>Last Name</span>,
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor('age', {
    //     header: () => 'Age',
    //     cell: info => info.renderValue(),
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor('visits', {
    //     header: () => <span>Visits</span>,
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor('status', {
    //     header: 'Status',
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor('progress', {
    //     header: 'Profile Progress',
    //     footer: info => info.column.id,
    // }),
    // ]

    return [columns, data.properties]
}

const App: React.FC = () => {
    useEffect(() => {
        emit("properties-init", { message: "lalala-" + Date.now() })
    }, [])

    return (
        <View />
    )
}

type PropertyTableProps = {
    data: PropertyItem[]
    columns: ColumnDef<PropertyItem>[]
}

const PropertyTable: React.FC<PropertyTableProps> = ({ data, columns }) => {
    const table = useReactTable({
        // columns: head,
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <table>
            <thead>
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>

            <tbody>
                {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
            <tfoot>
                {table.getFooterGroups().map(footerGroup => (
                    <tr key={footerGroup.id}>
                        {footerGroup.headers.map(header => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.footer,
                                        header.getContext()
                                    )}
                            </th>
                        ))}
                    </tr>
                ))}
            </tfoot>
        </table>
    )
}

const View: React.FC = () => {
    const def = useData()
    if (!def) {
        return null
    }

    return (
        <PropertyTable
            columns={def[0]}
            data={def[1]}
        />
    )

    // return (
    //     <Table>
    //         <thead>
    //             <tr>
    //                 {head.map((key, i) => (
    //                     <th key={i}>{key}</th>
    //                 ))}
    //             </tr>
    //         </thead>
    //         <tbody>
    //             {rows.map((row, i) => (
    //                 <tr key={i}>
    //                     {head.map((key, i) => (
    //                         <td key={i}>{row[key]}</td>
    //                     ))}
    //                 </tr>
    //             ))}
    //         </tbody>
    //     </Table>
    // )
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
