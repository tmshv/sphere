import { isUrl } from "@sphere/utils"
import { ValueImage } from "../internal"
import { CopyButton } from "./CopyButton"
import s from "./properties-viewer.module.css"

export type PropertiesViewerProps = {
    properties: { key: string; value: string }[]
    checkUrls?: boolean
}

export function PropertiesViewer({ properties, checkUrls = false }: PropertiesViewerProps) {
    return (
        <table className={s.table}>
            <tbody>
                {properties.map(({ key, value }) => (
                    <tr key={key}>
                        <td className={s.key}>{key}</td>
                        <td className={s.value}>
                            {checkUrls && isUrl(value) ? (
                                <ValueImage src={value} alt={key} size="large" />
                            ) : (
                                <span>{value}</span>
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
