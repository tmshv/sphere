import { createStyles } from "@mantine/core"
import { Allotment, type AllotmentHandle, LayoutPriority } from "allotment"
import { forwardRef } from "react"
import "allotment/dist/style.css"

export { LayoutPriority }

// allotment is themed entirely through five custom properties it declares on
// :root. Only the two colours need to follow the Mantine colour scheme; the
// default --sash-size of 8px is already a larger grab area than the 4px
// handle it replaces, so it is left alone.
const useStyles = createStyles(theme => ({
    root: {
        width: "100%",
        height: "100%",
        "--separator-border": theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[3],
        "--focus-border": theme.colors.blue[7],
    },
}))

export type SplitViewHandle = AllotmentHandle

export type SplitViewProps = {
    children: React.ReactNode
    vertical?: boolean
    defaultSizes?: number[]
    proportionalLayout?: boolean
    separator?: boolean
    className?: string
    onChange?: (sizes: number[]) => void
    onDragEnd?: (sizes: number[]) => void
}

export const SplitView = forwardRef<SplitViewHandle, SplitViewProps>(function SplitView(
    { children, className, ...props },
    ref,
) {
    const { classes: s, cx } = useStyles()

    return (
        <Allotment ref={ref} className={cx(s.root, className)} {...props}>
            {children}
        </Allotment>
    )
})

// SplitPane must BE Allotment.Pane, not wrap it. Allotment decides what is a
// pane by checking `displayName === "Allotment.Pane"` on the child element's
// type (see node_modules/allotment/dist/module.js). A wrapper component has
// no displayName of its own, so allotment falls into its "not a pane"
// branch for every child: minSize/maxSize/preferredSize/priority/visible are
// silently discarded, and the wrapper's own split-view-view div gets
// double-wrapped in a second, unregistered one that never receives a size —
// collapsing all content to zero. Re-exporting the real component keeps its
// displayName intact and is recognised natively.
export const SplitPane = Allotment.Pane

export type SplitPaneProps = React.ComponentProps<typeof SplitPane>
