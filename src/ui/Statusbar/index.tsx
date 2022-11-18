import { createStyles, Flex } from "@mantine/core"

const useStyle = createStyles(theme => ({
    container: {
        backgroundColor: theme.colors.dark,
        color: theme.colors.gray[1],

        height: 27,
    }
}))

export type StatusbarProps = {
    children: React.ReactNode
}

export const Statusbar: React.FC<StatusbarProps> = ({ children }) => {
    const { classes: s } = useStyle()
    return (
        <Flex gap={"xs"} p={"xs"} pl={"sm"} pr={"sm"} className={s.container}>
            {children}
        </Flex>
    )
}
