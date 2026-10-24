import { Tabs as MantineTabs } from "@mantine/core"
import type { ReactNode } from "react"
import { GAP_PX } from "../Layout"

const TAB_HEIGHT_PX = 30

export type TabItem = {
    value: string
    label: string
    icon?: ReactNode
    disabled?: boolean
    content: ReactNode
}

export type TabsProps = {
    value: string
    onChange(value: string): void
    items: ReadonlyArray<TabItem>
}

export function Tabs({ value, onChange, items }: TabsProps) {
    function handleTabChange(next: string | null) {
        if (next === null) {
            return
        }
        onChange(next)
    }

    return (
        <MantineTabs
            unstyled
            keepMounted={false}
            value={value}
            onTabChange={handleTabChange}
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
                    // that scrolls (SectionStack) opts out via its own
                    // createStyles class.
                    "& > *": {
                        flexShrink: 0,
                    },
                },
                tab: {
                    ...theme.fn.focusStyles(),
                    backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
                    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.colors.gray[9],
                    border: `1px solid ${theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[4]}`,
                    height: TAB_HEIGHT_PX,
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
        >
            <MantineTabs.List p={GAP_PX.sm}>
                {items.map(item => (
                    <MantineTabs.Tab key={item.value} value={item.value} icon={item.icon} disabled={item.disabled}>
                        {item.label}
                    </MantineTabs.Tab>
                ))}
            </MantineTabs.List>

            {items.map(item => (
                <MantineTabs.Panel key={item.value} value={item.value}>
                    {item.content}
                </MantineTabs.Panel>
            ))}
        </MantineTabs>
    )
}
