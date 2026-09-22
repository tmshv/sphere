import { Flex, createStyles } from "@mantine/core"

// A panel body is split in two: a header that always stays put — controls
// belong there — and the body below it, which scrolls when the panel runs out
// of room. Both need the parent to give the panel a bounded height.
const CONTAINER_STYLE: React.CSSProperties = {
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
}

// The panel owns the inset either side of its content, rather than taking it
// from whatever holds it. That lets the scrolling part reach the panel's own
// edge, so the overlay scrollbar macOS draws there rides over the inset instead
// of over the text — a column of counts, right-aligned, used to sit under it.
const useStyles = createStyles(theme => ({
    header: {
        flexShrink: 0,
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.sm,
    },
    body: {
        flex: "1 1 auto",
        minHeight: 0,
        overflowY: "auto",
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.sm,
    },
}))

export type PanelBodyProps = {
    header?: React.ReactNode
    children: React.ReactNode
}

export const PanelBody: React.FC<PanelBodyProps> = ({ header, children }) => {
    const { classes } = useStyles()

    return (
        <Flex direction={"column"} gap={"md"} style={CONTAINER_STYLE}>
            {!header ? null : <div className={classes.header}>{header}</div>}
            <div className={classes.body}>{children}</div>
        </Flex>
    )
}
