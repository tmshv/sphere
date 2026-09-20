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

export type SplitPaneProps = {
    children?: React.ReactNode
    minSize?: number
    maxSize?: number
    preferredSize?: number | string
    priority?: LayoutPriority
    snap?: boolean
    visible?: boolean
    className?: string
}

// allotment's Pane requires children; a spacer pane has none, so null stands
// in for it.
export const SplitPane: React.FC<SplitPaneProps> = ({ children = null, ...props }) => (
    <Allotment.Pane {...props}>{children}</Allotment.Pane>
)
