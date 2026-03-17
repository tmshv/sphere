import { Button, Group, Stack, Text, createStyles } from "@mantine/core"
import type { FallbackProps } from "react-error-boundary"

type Variant = "fullscreen" | "sidebar"

type ErrorFallbackProps = FallbackProps & {
    variant: Variant
}

const useStyles = createStyles((theme, { variant }: { variant: Variant }) => ({
    root: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: variant === "sidebar" ? theme.spacing.sm : theme.spacing.xl,
    },
    message: {
        maxWidth: variant === "sidebar" ? "100%" : 420,
    },
}))

export function ErrorFallback({ error, resetErrorBoundary, variant }: ErrorFallbackProps) {
    const { classes } = useStyles({ variant })

    return (
        <div className={classes.root}>
            <Stack spacing="sm" className={classes.message}>
                <Text weight={600} size={variant === "sidebar" ? "sm" : "lg"}>
                    Something went wrong
                </Text>
                <Text size="xs" color="dimmed" lineClamp={3}>
                    {error instanceof Error ? error.message : String(error)}
                </Text>
                <Group spacing="xs">
                    <Button size="xs" variant="light" onClick={resetErrorBoundary}>
                        Try Again
                    </Button>
                    <Button size="xs" variant="subtle" onClick={() => window.location.reload()}>
                        Reload App
                    </Button>
                </Group>
            </Stack>
        </div>
    )
}
