import { Center, createStyles, Flex, UnstyledButton } from "@mantine/core"
import { MouseEventHandler, ReactNode } from "react"

const useStyle = createStyles(theme => ({
    button: {
        flex: 1,
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",

        borderRadius: theme.radius.sm,
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.xs,

        color: theme.colorScheme === "dark" ? theme.white : theme.black,
        backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,

        // fontSize: theme.fontSizes.sm,
        fontSize: theme.fontSizes.xs,

        "&:hover": {
            backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
        },
    },
    active: {
        backgroundColor: theme.colors.blue[7],
        color: theme.white,

        "&:hover": {
            backgroundColor: theme.colors.blue[6],
        },
    },
}))

export type OutlineItemProps = {
    label: string
    active?: boolean
    icon?: ReactNode
    extra?: ReactNode
    onClick?: MouseEventHandler<HTMLButtonElement>
}

export const OutlineItem: React.FC<OutlineItemProps> = ({ label, active, icon, extra, onClick }) => {
    const { classes: s, cx } = useStyle()
    return (
        <Flex justify={"space-between"} gap={"xs"}>
            {!icon ? null : (
                <Center w={30} h={30}>
                    {icon}
                </Center>
            )}
            <UnstyledButton
                className={cx(s.button, { [s.active]: active })}
                onClick={onClick}
            >
                {label}
            </UnstyledButton>
            {extra}
        </Flex>
    )
}
