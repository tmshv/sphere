import { ActionIcon, createStyles } from "@mantine/core"
import type { ReactNode } from "react"

const useStyle = createStyles(theme => ({
    icon: {
        "&:hover": {
            backgroundColor: theme.colors.gray[8],
        },
    },
    fill: {
        backgroundColor: theme.colors.gray[8],
    },
}))

export type StatusbarButtonLook = "accent" | "fill"

export type StatusbarButtonProps = {
    icon: ReactNode
    /** Names the button for assistive tech and shows as its tooltip. */
    label: string
    onClick: () => void
    disabled?: boolean
    active?: boolean
    /** How an active button stands out: a yellow icon, or a filled background. */
    activeLook?: StatusbarButtonLook
}

export function StatusbarButton({
    icon,
    label,
    onClick,
    disabled = false,
    active,
    activeLook = "accent",
}: StatusbarButtonProps) {
    const { classes, cx } = useStyle()
    const isFilled = active === true && activeLook === "fill"
    const isAccent = active === true && activeLook === "accent"

    return (
        <ActionIcon
            size={"xs"}
            radius={"sm"}
            className={cx(classes.icon, isFilled && classes.fill)}
            color={isAccent ? "yellow" : undefined}
            aria-label={label}
            aria-pressed={active}
            title={label}
            disabled={disabled}
            onClick={onClick}
            sx={theme => ({
                "&[data-disabled]": {
                    backgroundColor: "#00000000",
                    color: theme.colors.gray[8],
                    border: "none",
                },
            })}
        >
            {icon}
        </ActionIcon>
    )
}
