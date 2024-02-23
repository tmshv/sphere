import { createStyles } from "@mantine/core"
import { memo } from "react"

const useStyle = createStyles(theme => ({
    icon: {
        display: "block",
        position: "relative",
        width: 24,
        height: 24,

        backgroundColor: theme.white,
        backgroundSize: "cover",

        border: "solid 3px white",
        boxShadow: "0px 0px 5px rgba(0, 0, 30, 0.25)",
    },
    square: {
        borderRadius: 3,
    },
    circle: {
        borderRadius: "50%",
    },
}))

export type ImageMarkerLayout = "circle" | "square"

export type ImageMarkerProps = {
    src: string
    size: number
    layout: ImageMarkerLayout
    style?: React.CSSProperties
    children?: React.ReactNode
    onHover?: () => void
}

export const ImageMarker: React.FC<ImageMarkerProps> = memo(({ src, size, layout, style, children, onHover }) => {
    const { classes: s, cx } = useStyle()
    return (
        <span
            className={cx(s.icon, s[layout])}
            style={{
                ...style,
                width: size,
                height: size,
                backgroundImage: `url(${src})`,
            }}
            onMouseEnter={onHover}
        >
            {children}
        </span>
    )
})

ImageMarker.displayName = "ImageMarker"
