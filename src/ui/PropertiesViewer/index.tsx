import { isUrl } from "@/lib/predict-data-type"
import { Image, createStyles } from "@mantine/core"
import { CopyButton } from "./CopyButton"

const useStyles = createStyles(theme => ({
    table: {
        minWidth: 300,
        width: "100%",
        paddingBottom: theme.spacing.sm,
        fontSize: 12,
    },
    key: {
        display: "flex",
    },
    value: {
        maxWidth: 200,
    },
}))

type PropertyValue = string | number | boolean | null | undefined

export type PropertiesViewerProps = {
    properties: { key: string; value: PropertyValue }[]
    checkUrls?: boolean
}

function formatValue(value: PropertyValue): string {
    if (value === null) {
        return "null"
    }
    if (value === undefined) {
        return ""
    }
    return String(value)
}

export const PropertiesViewer: React.FC<PropertiesViewerProps> = ({ properties, checkUrls = false }) => {
    const { classes: s } = useStyles()

    return (
        <table className={s.table}>
            <tbody>
                {properties.map(({ key, value }) => {
                    const formatted = formatValue(value)

                    return (
                        <tr key={key}>
                            <td className={s.key}>{key}</td>
                            <td className={s.value}>
                                {checkUrls && typeof value === "string" && isUrl(value) ? (
                                    <Image src={value} width={120} height={120} />
                                ) : (
                                    <span>{formatted}</span>
                                )}
                            </td>
                            <td>
                                <CopyButton value={formatted} />
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}
