import { createStyles, Flex } from "@mantine/core"

const useStyle = createStyles(theme => ({
    container: {
        backgroundColor: theme.colors.gray[8],
    }
}))

export type StatusbarProps = {
    children: React.ReactNode
}

export const Statusbar: React.FC<StatusbarProps> = ({ children }) => {
    const { classes: s } = useStyle()
    return (
        <Flex gap={"xs"} p={"xs"} className={s.container}>
            {/* <div style={{
            // height: 24,
            backgroundColor: "#2d4144",
            color: "white",
            padding: "0 4px",
            fontFamily: "monospace",
        }}> */}
            {children}
            {/* </div> */}
        </Flex>
    )
}
