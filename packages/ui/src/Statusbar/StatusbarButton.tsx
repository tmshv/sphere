import { ActionIcon, createStyles } from "@mantine/core"
import type { ReactNode } from "react"

// The statusbar used to sit in its own light-scheme MantineProvider. Its icons
// keep the colours and press feel of that scheme in both themes, so they stay
// legible on the always-dark bar.
const LIGHT_SCHEME = "light"
const ACCENT_COLOR = "yellow"
const PRESS_STYLE = { transform: "translateY(1px)" }

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
            color={isAccent ? ACCENT_COLOR : undefined}
            aria-label={label}
            aria-pressed={active}
            title={label}
            disabled={disabled}
            onClick={() => onClick()}
            sx={theme => ({
                color: theme.colors[isAccent ? ACCENT_COLOR : "gray"][theme.fn.primaryShade(LIGHT_SCHEME)],
                "&:active": PRESS_STYLE,
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
