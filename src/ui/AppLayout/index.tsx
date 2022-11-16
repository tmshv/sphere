import { createStyles, Flex } from '@mantine/core';

const useStyles = createStyles(() => ({
    container: {
        width: "100%",
        height: "100%",
    },
    body: {
        flex: 1,
    },
}))

export type AppLayoutProps = {
    children: React.ReactNode
    footer: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, footer }) => {
    const { classes: s } = useStyles()

    return (
        <Flex
            direction="column"
            className={s.container}
        >
            <div className={s.body}>
                {children}
            </div>

            {footer}
        </Flex>
    );
}
