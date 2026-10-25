import { memo } from "react"
import s from "./image-marker.module.css"

export type ImageMarkerLayout = "circle" | "square"

const LAYOUT_CLASS: Record<ImageMarkerLayout, string> = {
    circle: s.circle,
    square: s.square,
}

export type ImageMarkerProps = {
    src: string
    size: number
    layout: ImageMarkerLayout
    style?: React.CSSProperties
    children?: React.ReactNode
    onHover?: () => void
    onLeaveHover?: () => void
}

export const ImageMarker = memo(function ImageMarker({
    src,
    size,
    layout,
    style,
    children,
    onHover,
    onLeaveHover,
}: ImageMarkerProps) {
    return (
        <span
            className={`${s.icon} ${LAYOUT_CLASS[layout]}`}
            style={{
                ...style,
                width: size,
                height: size,
                backgroundImage: `url(${src})`,
            }}
            onMouseEnter={onHover}
            onMouseLeave={onLeaveHover}
        >
            {children}
        </span>
    )
})
