import type { CSSProperties } from "react"
import type { FallbackProps } from "react-error-boundary"
import button from "../Button/button.module.css"
import { unstyledButton } from "../internal"
import { Row, Stack } from "../Layout"
import { Text } from "../Text"
import s from "./error-fallback.module.css"

type Variant = "fullscreen" | "sidebar"

type ErrorFallbackProps = FallbackProps & {
    variant: Variant
}

const MESSAGE_LINES = 3

const TITLE_STYLE: Record<Variant, CSSProperties> = {
    sidebar: { fontSize: "var(--sphere-font-size-sm)" },
    fullscreen: { fontSize: "var(--sphere-font-size-lg)" },
}

// Mantine 5 Text `lineClamp`.
const MESSAGE_STYLE: CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: MESSAGE_LINES,
    WebkitBoxOrient: "vertical",
}

// Mantine 5 Group wraps unless told not to.
const ACTIONS_STYLE: CSSProperties = { flexWrap: "wrap" }

const VARIANT_CLASS: Record<Variant, string> = {
    sidebar: s.sidebar,
    fullscreen: s.fullscreen,
}

const LIGHT_CLASSES = [unstyledButton, s.action, s.light].join(" ")
const SUBTLE_CLASSES = [unstyledButton, s.action, s.subtle].join(" ")

export function ErrorFallback({ error, resetErrorBoundary, variant }: ErrorFallbackProps) {
    return (
        <div className={`${s.root} ${VARIANT_CLASS[variant]}`}>
            <Stack gap="sm" className={s.message}>
                <Text weight="semibold" style={TITLE_STYLE[variant]}>
                    Something went wrong
                </Text>
                <Text tone="dimmed" style={MESSAGE_STYLE}>
                    {error instanceof Error ? error.message : String(error)}
                </Text>
                <Row gap="xs" align="center" style={ACTIONS_STYLE}>
                    <button type="button" className={LIGHT_CLASSES} onClick={resetErrorBoundary}>
                        <div className={button.inner}>
                            <span className={button.label}>Try Again</span>
                        </div>
                    </button>
                    <button type="button" className={SUBTLE_CLASSES} onClick={() => window.location.reload()}>
                        <div className={button.inner}>
                            <span className={button.label}>Reload App</span>
                        </div>
                    </button>
                </Row>
            </Stack>
        </div>
    )
}
