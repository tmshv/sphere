import s from "./panel-body.module.css"

export type PanelBodyProps = {
    header?: React.ReactNode
    children: React.ReactNode
}

export function PanelBody({ header, children }: PanelBodyProps) {
    return (
        <div className={s.container}>
            {!header ? null : <div className={s.header}>{header}</div>}
            <div className={s.body}>{children}</div>
        </div>
    )
}
