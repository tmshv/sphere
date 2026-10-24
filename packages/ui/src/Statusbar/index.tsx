import { Flex, createStyles } from "@mantine/core"
import type { ReactNode } from "react"

export { StatusbarBadge } from "./StatusbarBadge"
export type { StatusbarBadgeProps, StatusbarBadgeTone, StatusbarBadgeWidth } from "./StatusbarBadge"
export { StatusbarButton } from "./StatusbarButton"
export type { StatusbarButtonLook, StatusbarButtonProps } from "./StatusbarButton"
export { StatusbarSelect } from "./StatusbarSelect"
export type { StatusbarSelectProps } from "./StatusbarSelect"

const useStyle = createStyles(theme => ({
    container: {
        backgroundColor: theme.colors.dark,
        color: theme.colors.gray[1],

        height: 28,
    },
}))

export type StatusbarProps = {
    children: ReactNode
}

export function Statusbar({ children }: StatusbarProps) {
    const { classes: s } = useStyle()
    return (
        <Flex gap={"sm"} p={"xs"} pl={"sm"} pr={"sm"} align={"center"} className={s.container}>
            {children}
        </Flex>
    )
}
