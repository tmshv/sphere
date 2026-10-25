import { Button as BaseButton } from "@base-ui/react/button"
import type { FallbackProps } from "react-error-boundary"
import button from "../Button/button.module.css"
import { unstyledButton } from "../internal"
import { Row, Stack } from "../Layout"
import { textClassName } from "../Text/text-class"
import s from "./error-fallback.module.css"

type Variant = "fullscreen" | "sidebar"

type ErrorFallbackProps = FallbackProps & {
    variant: Variant
}

const TITLE_CLASS: Record<Variant, string> = {
    sidebar: textClassName({ weight: "semibold", extra: [s.titleSidebar] }),
    fullscreen: textClassName({ weight: "semibold", extra: [s.titleFullscreen] }),
}

const MESSAGE_CLASS = textClassName({ tone: "dimmed", extra: [s.messageText] })

const VARIANT_CLASS: Record<Variant, string> = {
    sidebar: s.sidebar,
    fullscreen: s.fullscreen,
}

// The Button's own box with the light and subtle variants, which are not part of the public ButtonVariant.
const LIGHT_CLASSES = [unstyledButton, button.button, button.light].join(" ")
const SUBTLE_CLASSES = [unstyledButton, button.button, button.subtle].join(" ")

export function ErrorFallback({ error, resetErrorBoundary, variant }: ErrorFallbackProps) {
    return (
        <div className={`${s.root} ${VARIANT_CLASS[variant]}`}>
            <Stack gap="sm" className={s.message}>
                <div className={TITLE_CLASS[variant]}>Something went wrong</div>
                <div className={MESSAGE_CLASS}>{error instanceof Error ? error.message : String(error)}</div>
                <Row gap="xs" align="center" className={s.actions}>
                    <BaseButton type="button" className={LIGHT_CLASSES} onClick={resetErrorBoundary}>
                        <div className={button.inner}>
                            <span className={button.label}>Try Again</span>
                        </div>
                    </BaseButton>
                    <BaseButton type="button" className={SUBTLE_CLASSES} onClick={() => window.location.reload()}>
                        <div className={button.inner}>
                            <span className={button.label}>Reload App</span>
                        </div>
                    </BaseButton>
                </Row>
            </Stack>
        </div>
    )
}
