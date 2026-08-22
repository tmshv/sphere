import { Box, createStyles } from "@mantine/core"

const useStyles = createStyles(theme => {
    const topLeftOffset = theme.spacing.sm + theme.spacing.xl
    const topRightOffset = theme.spacing.sm
    const bottomGap = theme.spacing.sm

    return {
        container: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 100,
        },

        // Positioning wrappers must stay transparent to the mouse: they can be
        // wider or taller than their content and would otherwise swallow clicks
        // meant for the map underneath. Only the content itself is interactive.
        inner: {
            position: "absolute",
            pointerEvents: "none",
            "& > *": {
                pointerEvents: "auto",
            },
        },

        // Scrollable regions are bounded with max-height instead of an anchored
        // bottom edge, so the wrapper shrinks to its content and leaves the rest
        // of the map clickable.
        topLeft: {
            top: topLeftOffset,
            left: theme.spacing.md,
            maxHeight: `calc(100% - ${topLeftOffset + bottomGap}px)`,
            display: "flex",
            flexDirection: "column",
        },

        left: {
            top: "50%",
            left: theme.spacing.md,
            transform: "translateY(-50%)",
        },

        right: {
            top: "50%",
            right: theme.spacing.md,
            transform: "translateY(-50%)",
        },

        topRight: {
            top: topRightOffset,
            right: theme.spacing.sm,
            maxHeight: `calc(100% - ${topRightOffset + bottomGap}px)`,
            display: "flex",
            flexDirection: "column",
        },

        top: {
            top: theme.spacing.md,
            left: "50%",
            transform: "translateX(-50%)",
        },

        bottom: {
            bottom: theme.spacing.md,
            left: "50%",
            transform: "translateX(-50%)",
        },
    }
})

export type OverlayProps = {
    left?: React.ReactNode
    right?: React.ReactNode
    top?: React.ReactNode
    bottom?: React.ReactNode
    topLeft?: React.ReactNode
    topRight?: React.ReactNode
}

export const Overlay: React.FC<OverlayProps> = ({ topLeft, topRight, left, right, top, bottom }) => {
    const { classes: s, cx } = useStyles()

    return (
        <Box className={s.container}>
            {!topRight ? null : <Box className={cx(s.inner, s.topRight)}>{topRight}</Box>}
            {!topLeft ? null : <Box className={cx(s.inner, s.topLeft)}>{topLeft}</Box>}
            {!left ? null : <Box className={cx(s.inner, s.left)}>{left}</Box>}
            {!right ? null : <Box className={cx(s.inner, s.right)}>{right}</Box>}
            {!top ? null : <Box className={cx(s.inner, s.top)}>{top}</Box>}
            {!bottom ? null : <Box className={cx(s.inner, s.bottom)}>{bottom}</Box>}
        </Box>
    )
}
