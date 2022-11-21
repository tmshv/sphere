import { ButtonProps, Center, createStyles, Flex, UnstyledButton } from '@mantine/core'
import { MouseEventHandler, ReactNode } from 'react'
import { ActionBarOnClick } from '../ActionBar'

const useStyle = createStyles(theme => ({
    button: {
        flex: 1,
        color: theme.white,
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: 'hidden',

        borderRadius: theme.radius.sm,
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.xs,

        backgroundColor: theme.colors.dark[7],

        // fontSize: theme.fontSizes.sm,
        fontSize: theme.fontSizes.xs,

        "&:hover": {
            backgroundColor: theme.colors.dark[6],
        }
    },
    active: {
        backgroundColor: theme.colors.blue[7],

        "&:hover": {
            backgroundColor: theme.colors.blue[6],
        }
    },
}))

export type OutlineItemProps = {
    label: string
    active?: boolean
    icon?: ReactNode
    extra?: ReactNode
    // onClick: OnClick
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
