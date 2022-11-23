import { createStyles, Flex, MantineColor } from "@mantine/core"

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

export const Statusbar: React.FC<StatusbarProps> = ({ children, color }) => {
    const { classes: s } = useStyle()
    return (
        <Flex gap={"xs"} p={"xs"} pl={"sm"} pr={"sm"} align={"center"} className={s.container} style={{ backgroundColor: color }}>
            {children}
        </Flex>
    )
}
