import { Badge, createStyles } from "@mantine/core"
import type { ReactNode } from "react"

// Fixed widths keep a changing readout (zoom, coordinates) from shoving its
// neighbours around.
const WIDTH_SHORT_PX = 90
const WIDTH_LONG_PX = 101

const useStyle = createStyles(theme => ({
    widget: {
        fontFamily: "monospace",
        userSelect: "none",
        cursor: "default",

        justifyContent: "start",

        // For pixel perfect vertical alignment.
        // Works together with Statusbar height 27 px
        position: "relative",
        top: 1,

        backgroundColor: theme.colors.dark,
        color: theme.white,
    },

    error: {
        backgroundColor: theme.colors.red[8],
        color: theme.white,
    },

    short: {
        width: WIDTH_SHORT_PX,
    },

    long: {
        width: WIDTH_LONG_PX,
    },
}))

export type StatusbarBadgeWidth = "auto" | "short" | "long"
export type StatusbarBadgeTone = "default" | "error"

export type StatusbarBadgeProps = {
    children: ReactNode
    title?: string
    width?: StatusbarBadgeWidth
    tone?: StatusbarBadgeTone
}

export function StatusbarBadge({ children, title, width = "auto", tone = "default" }: StatusbarBadgeProps) {
    const { classes, cx } = useStyle()
    const isError = tone === "error"

    return (
        <Badge
            className={cx(
                classes.widget,
                width === "short" && classes.short,
                width === "long" && classes.long,
                isError && classes.error,
            )}
            title={title}
            radius={"sm"}
            size={"sm"}
            variant={isError ? "filled" : "light"}
        >
            {children}
        </Badge>
    )
}
