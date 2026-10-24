import { Flex, createStyles } from "@mantine/core"

const useStyle = createStyles(() => ({
    container: {
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
    },
}))

export type SidebarProps = {
    children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
    const { classes: s } = useStyle()

    return (
        <Flex pt={"xl"} p={0} className={s.container}>
            {children}
        </Flex>
    )
}
