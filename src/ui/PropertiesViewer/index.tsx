import React from "react";
import { createStyles } from "@mantine/core";

const useStyles = createStyles(theme => ({
    table: {
        width: "100%",
    },
    key: {
        fontWeight: 700,
        paddingRight: theme.spacing.sm,
        display: "flex",
    },
    value: {
        maxWidth: 150,
    },
}))

export type PropertiesViewerProps = {
    properties: { key: string, value: any }[]
}

export const PropertiesViewer: React.FC<PropertiesViewerProps> = ({ properties }) => {
    const { classes: s } = useStyles()

    return (
        <table className={s.table}>
            <tbody>
                {properties.map(({ key, value }) => (
                    <tr key={key}>
                        <td className={s.key}>{key}</td>
                        <td className={s.value}>
                            {/* <Badge
                            radius={"xs"}
                        > */}
                            {value}
                            {/* </Badge> */}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
