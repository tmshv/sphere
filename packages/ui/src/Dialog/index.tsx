import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import { IconX } from "@sphere/icons"
import { type ReactNode, useRef } from "react"
import { IconButton } from "../Button"
import s from "./dialog.module.css"

const CLOSE_LABEL = "Close"
const CONTROL_SELECTOR = "input, select, textarea, button"

export type DialogProps = {
    opened: boolean
    onClose: () => void
    title: string
    footer?: ReactNode
    children: ReactNode
}

export function Dialog({ opened, onClose, title, footer, children }: DialogProps) {
    const popup = useRef<HTMLDivElement>(null)
    const body = useRef<HTMLDivElement>(null)

    // Focus starts on the first control of the body, never on the close button; with none it starts on the popup.
    function initialFocus(): HTMLElement | null {
        return body.current?.querySelector<HTMLElement>(CONTROL_SELECTOR) ?? popup.current
    }

    function handleOpenChange(open: boolean) {
        if (!open) {
            onClose()
        }
    }

    return (
        <BaseDialog.Root open={opened} onOpenChange={handleOpenChange}>
            <BaseDialog.Portal>
                <BaseDialog.Backdrop className={s.backdrop} />
                <BaseDialog.Viewport className={s.viewport}>
                    <BaseDialog.Popup ref={popup} className={s.popup} initialFocus={initialFocus}>
                        <div className={s.header}>
                            <BaseDialog.Title render={<div />} className={s.title}>
                                {title}
                            </BaseDialog.Title>
                            <IconButton icon={<IconX />} label={CLOSE_LABEL} onClick={onClose} />
                        </div>
                        <BaseDialog.Description render={<div ref={body} />} className={s.body}>
                            {children}
                            {footer ? <div className={s.footer}>{footer}</div> : null}
                        </BaseDialog.Description>
                    </BaseDialog.Popup>
                </BaseDialog.Viewport>
            </BaseDialog.Portal>
        </BaseDialog.Root>
    )
}
