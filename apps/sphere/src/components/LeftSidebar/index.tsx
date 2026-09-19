import { Paper, Tabs, type TabsProps } from "@mantine/core"
import { IconDatabase, IconSquaresFilled, IconStack } from "@tabler/icons"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectActiveSidebarTab } from "@/store/app"
import { LayersTab } from "./LayersTab"
import { SourcesTab } from "./SourcesTab"

const PANEL_STYLE: React.CSSProperties = {
    width: 300,
    overflow: "hidden",
}

export function StyledTabs(props: TabsProps) {
    return (
        <Tabs
            unstyled
            styles={theme => ({
                // The tabs own the whole sidebar height: the list keeps its
                // natural height and the active panel takes the rest, so the
                // panel content scrolls inside the sidebar instead of running
                // past its bottom edge.
                root: {
                    width: "100%",
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                },
                panel: {
                    flex: "1 1 0",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",

                    // Toolbars and headers keep their height; the one child
                    // that scrolls (the accordion) opts out with its own
                    // inline flex value.
                    "& > *": {
                        flexShrink: 0,
                    },
                },
                tab: {
                    ...theme.fn.focusStyles(),
                    // width: "100%",
                    // width: 200,
                    backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
                    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.colors.gray[9],
                    border: `1px solid ${theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[4]}`,
                    // padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                    height: 30,
                    cursor: "pointer",
                    fontSize: theme.fontSizes.sm,
                    display: "flex",
                    alignItems: "center",

                    "&:disabled": {
                        opacity: 0.5,
                        cursor: "not-allowed",
                    },

                    "&:not(:first-of-type)": {
                        borderLeft: 0,
                    },

                    "&:first-of-type": {
                        borderTopLeftRadius: theme.radius.sm,
                        borderBottomLeftRadius: theme.radius.sm,
                    },

                    "&:last-of-type": {
                        borderTopRightRadius: theme.radius.sm,
                        borderBottomRightRadius: theme.radius.sm,
                    },

                    "&[data-active]": {
                        backgroundColor: theme.colors.blue[7],
                        borderColor: theme.colors.blue[7],
                        color: theme.white,
                    },
                },

                tabIcon: {
                    marginRight: theme.spacing.xs,
                    display: "flex",
                    alignItems: "center",
                },

                tabsList: {
                    display: "flex",
                    flexShrink: 0,
                },
            })}
            {...props}
        />
    )
}

export const LeftSidebar: React.FC = () => {
    const dispatch = useAppDispatch()
    const activeTab = useAppSelector(selectActiveSidebarTab)

    const handleTabChange = (value: string | null) => {
        dispatch(actions.app.setActiveSidebarTab(value as "sources" | "layers"))
    }

    return (
        <StyledTabs value={activeTab} keepMounted={false} onTabChange={handleTabChange}>
            <Tabs.List p={"sm"}>
                <Tabs.Tab value="sources" icon={<IconDatabase size={16} />}>
                    Sources
                </Tabs.Tab>
                <Tabs.Tab value="layers" icon={<IconStack size={16} />}>
                    Layers
                </Tabs.Tab>
                <Tabs.Tab value="map-styles" icon={<IconSquaresFilled size={16} />} disabled>
                    Styles
                </Tabs.Tab>
                {/* <Tabs.Tab value="settings" icon={<IconSettings size={16} />}>
                    Settings
                </Tabs.Tab> */}
            </Tabs.List>

            <Tabs.Panel value="layers">
                <LayersTab />
            </Tabs.Panel>

            <Tabs.Panel value="sources">
                <SourcesTab />
            </Tabs.Panel>

            <Tabs.Panel value="map-styles">
                <Paper p={"sm"} style={PANEL_STYLE}>
                    Map Styles
                </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="settings">
                <Paper p={"sm"} style={PANEL_STYLE}>
                    Settings
                </Paper>
            </Tabs.Panel>
        </StyledTabs>
    )
}
