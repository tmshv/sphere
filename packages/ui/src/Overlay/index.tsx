import s from "./overlay.module.css"

export type OverlayProps = {
    left?: React.ReactNode
    right?: React.ReactNode
    top?: React.ReactNode
    bottom?: React.ReactNode
    topLeft?: React.ReactNode
    topRight?: React.ReactNode
}

export function Overlay({ topLeft, topRight, left, right, top, bottom }: OverlayProps) {
    return (
        <div className={s.container}>
            {!topRight ? null : <div className={`${s.inner} ${s.topRight}`}>{topRight}</div>}
            {!topLeft ? null : <div className={`${s.inner} ${s.topLeft}`}>{topLeft}</div>}
            {!left ? null : <div className={`${s.inner} ${s.left}`}>{left}</div>}
            {!right ? null : <div className={`${s.inner} ${s.right}`}>{right}</div>}
            {!top ? null : <div className={`${s.inner} ${s.top}`}>{top}</div>}
            {!bottom ? null : <div className={`${s.inner} ${s.bottom}`}>{bottom}</div>}
        </div>
    )
}
