import { Flex, type MantineColor, createStyles } from "@mantine/core"

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
    children: React.ReactNode
    color?: MantineColor
}

export function Statusbar({ children, color }: StatusbarProps) {
    const { classes: s } = useStyle()
    return (
        <Flex
            gap={"sm"}
            p={"xs"}
            pl={"sm"}
            pr={"sm"}
            align={"center"}
            className={s.container}
            style={{ backgroundColor: color }}
        >
            {children}
        </Flex>
    )
}
