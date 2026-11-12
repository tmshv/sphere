import type { FallbackProps } from "react-error-boundary"
import { Button } from "../Button"
import { cx } from "../internal"
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

export function ErrorFallback({ error, resetErrorBoundary, variant }: ErrorFallbackProps) {
    return (
        <div className={cx(s.root, VARIANT_CLASS[variant])}>
            <Stack gap="sm" className={s.message}>
                <div className={TITLE_CLASS[variant]}>Something went wrong</div>
                <div className={MESSAGE_CLASS}>{error instanceof Error ? error.message : String(error)}</div>
                <Row gap="xs" align="center" className={s.actions}>
                    <Button variant="secondary" onClick={resetErrorBoundary}>
                        Try Again
                    </Button>
                    <Button variant="secondary" onClick={() => window.location.reload()}>
                        Reload App
                    </Button>
                </Row>
            </Stack>
        </div>
    )
}
