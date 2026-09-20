import { Flex, createStyles } from "@mantine/core"
import { LayoutPriority, SplitPane, SplitView } from "../Split"

export type SidebarSize = {
    preferred: number
    min: number
    max: number
}

// The values the hand-rolled sidebar hook used, so nothing moves on upgrade.
export const DEFAULT_SIDEBAR_SIZE: SidebarSize = {
    preferred: 300,
    min: 265,
    max: 500,
}

const useStyles = createStyles(() => ({
    container: {
        width: "100%",
        height: "100%",
    },
    main: {
        flex: 1,
        overflow: "hidden",
    },
}))

export type AppLayoutProps = {
    children: React.ReactNode
    footer: React.ReactNode
    leftSidebar?: React.ReactNode
    rightSidebar?: React.ReactNode
    leftSidebarSize?: SidebarSize
    rightSidebarSize?: SidebarSize
}

export const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    footer,
    leftSidebar,
    rightSidebar,
    leftSidebarSize = DEFAULT_SIDEBAR_SIZE,
    rightSidebarSize = DEFAULT_SIDEBAR_SIZE,
}) => {
    const { classes: s } = useStyles()

    return (
        <Flex direction={"column"} className={s.container}>
            <SplitView className={s.main} proportionalLayout={false}>
                <SplitPane
                    visible={leftSidebar != null}
                    preferredSize={leftSidebarSize.preferred}
                    minSize={leftSidebarSize.min}
                    maxSize={leftSidebarSize.max}
                >
                    {leftSidebar}
                </SplitPane>

                {/* proportionalLayout is off, so panes are resized by priority
                    instead of proportion: the body's LayoutPriority.High makes
                    it absorb window-size changes first, leaving the sidebars
                    at the width the user gave them. */}
                <SplitPane priority={LayoutPriority.High}>{children}</SplitPane>

                <SplitPane
                    visible={rightSidebar != null}
                    preferredSize={rightSidebarSize.preferred}
                    minSize={rightSidebarSize.min}
                    maxSize={rightSidebarSize.max}
                >
                    {rightSidebar}
                </SplitPane>
            </SplitView>

            {footer}
        </Flex>
    )
}
