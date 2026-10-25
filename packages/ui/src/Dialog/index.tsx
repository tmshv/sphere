import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import type { ReactNode } from "react"
import iconButton from "../Button/icon-button.module.css"
import { unstyledButton } from "../internal"
import s from "./dialog.module.css"

const CLOSE_LABEL = "Close"
const CLOSE_CLASS = [unstyledButton, iconButton.iconButton, iconButton.sizeMd, iconButton.subtle, s.close].join(" ")

export type DialogProps = {
    opened: boolean
    onClose: () => void
    title: string
    footer?: ReactNode
    children: ReactNode
}

// Mantine's close glyph (CloseIcon.js).
function CloseGlyph() {
    return (
        <svg
            className={s.closeIcon}
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
            />
        </svg>
    )
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
                            <BaseDialog.Close className={CLOSE_CLASS} aria-label={CLOSE_LABEL}>
                                <CloseGlyph />
                            </BaseDialog.Close>
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
