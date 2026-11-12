import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import { IconX } from "@sphere/icons"
import type { ReactNode } from "react"
import { IconButton } from "../Button"
import s from "./dialog.module.css"

const CLOSE_LABEL = "Close"

export type DialogProps = {
    opened: boolean
    onClose: () => void
    title: string
    footer?: ReactNode
    children: ReactNode
}

export function Dialog({ opened, onClose, title, footer, children }: DialogProps) {
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
                    <BaseDialog.Popup className={s.popup}>
                        <div className={s.header}>
                            <BaseDialog.Title render={<div />} className={s.title}>
                                {title}
                            </BaseDialog.Title>
                            <IconButton icon={<IconX />} label={CLOSE_LABEL} onClick={onClose} />
                        </div>
                        <BaseDialog.Description render={<div />} className={s.body}>
                            {children}
                            {footer ? <div className={s.footer}>{footer}</div> : null}
                        </BaseDialog.Description>
                    </BaseDialog.Popup>
                </BaseDialog.Viewport>
            </BaseDialog.Portal>
        </BaseDialog.Root>
    )
}
