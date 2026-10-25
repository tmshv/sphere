import { isUrl } from "@sphere/utils"
import { CopyButton } from "./CopyButton"
import s from "./properties-viewer.module.css"

export type PropertiesViewerProps = {
    properties: { key: string; value: string }[]
    checkUrls?: boolean
}

function ValueImage({ src, alt }: { src: string; alt: string }) {
    return (
        <div className={s.image}>
            <figure className={s.figure}>
                <div className={s.imageWrapper}>
                    <img className={s.img} src={src} alt={alt} />
                </div>
            </figure>
        </div>
    )
}

export function PropertiesViewer({ properties, checkUrls = false }: PropertiesViewerProps) {
    return (
        <table className={s.table}>
            <tbody>
                {properties.map(({ key, value }) => (
                    <tr key={key}>
                        <td className={s.key}>{key}</td>
                        <td className={s.value}>
                            {checkUrls && isUrl(value) ? <ValueImage src={value} alt={key} /> : <span>{value}</span>}
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
