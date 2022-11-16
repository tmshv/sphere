import { createStyles, Flex } from "@mantine/core"

const useStyle = createStyles(theme => ({
    container: {
        backgroundColor: theme.colors.gray[8],
        color: theme.colors.gray[1],
    }
}))

export type StatusbarProps = {
    children: React.ReactNode
}

export const Statusbar: React.FC<StatusbarProps> = ({ children }) => {
    const { classes: s } = useStyle()
    return (
        <Flex gap={"sm"} p={"xs"} className={s.container}>
            {children}
        </Flex>
    )
}
