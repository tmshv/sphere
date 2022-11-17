import { createStyles, Flex } from '@mantine/core';

const useStyles = createStyles(() => ({
    container: {
        width: "100%",
        height: "100%",
    },
    main: {
        flex: 1,
    },
    body: {
        position: "relative",
        flex: 1,
    },
}))

export type AppLayoutProps = {
    children: React.ReactNode
    footer: React.ReactNode
    leftSidebar?: React.ReactNode
    rightSidebar?: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, footer, leftSidebar, rightSidebar }) => {
    const { classes: s } = useStyles()

    return (
        <Flex
            direction="column"
            className={s.container}
        >
            <Flex
                direction={"row"}
                className={s.main}
            >
                {leftSidebar}

                <div className={s.body}>
                    {children}
                </div>

                {rightSidebar}
            </Flex>

            {footer}
        </Flex>
    );
}
