import s from "./Skeleton.module.css"

const DEFAULT_WIDTH = "100%"

export type SkeletonProps = {
    height: number
    width?: number | string
}

export function Skeleton({ height, width = DEFAULT_WIDTH }: SkeletonProps) {
    return <div className={s.skeleton} style={{ height, width }} />
}
