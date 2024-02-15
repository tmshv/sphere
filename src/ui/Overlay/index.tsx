import { Box, createStyles } from "@mantine/core"

const useStyles = createStyles(theme => ({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
    },

    inner: {
        position: "absolute",
        pointerEvents: "auto",
    },

    topLeft: {
        top: theme.spacing.sm + theme.spacing.xl,
        left: theme.spacing.md,
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
        top: theme.spacing.sm,
        right: theme.spacing.sm,
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
}))

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
            {!topRight ? null : (
                <Box className={cx(s.inner, s.topRight)}>
                    {topRight}
                </Box>
            )}
            {!topLeft ? null : (
                <Box className={cx(s.inner, s.topLeft)}>
                    {topLeft}
                </Box>
            )}
            {!left ? null : (
                <Box className={cx(s.inner, s.left)}>
                    {left}
                </Box>
            )}
            {!right ? null : (
                <Box className={cx(s.inner, s.right)}>
                    {right}
                </Box>
            )}
            {!top ? null : (
                <Box className={cx(s.inner, s.top)}>
                    {top}
                </Box>
            )}
            {!bottom ? null : (
                <Box className={cx(s.inner, s.bottom)}>
                    {bottom}
                </Box>
            )}
        </Box>
    )
}
