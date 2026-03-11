import { createStyles, Image } from "@mantine/core"
import { isUrl } from "@/lib/predict-data-type"
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

export type PropertiesViewerProps = {
    properties: { key: string, value: any }[]
    checkUrls?: boolean
}

export const PropertiesViewer: React.FC<PropertiesViewerProps> = ({ properties, checkUrls = false }) => {
    const { classes: s } = useStyles()

    return (
        <table className={s.table}>
            <tbody>
                {properties.map(({ key, value }) => (
                    <tr key={key}>
                        <td className={s.key}>{key}</td>
                        <td className={s.value}>
                            {checkUrls && isUrl(value) ? (
                                <Image
                                    src={value}
                                    width={120}
                                    height={120}
                                />
                            ) : (
                                <span>
                                    {value}
                                </span>
                            )}
                        </td>
                        <td>
                            <CopyButton value={value} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
