import { Popover as BasePopover } from "@base-ui/react/popover"
import type { ReactNode, RefObject } from "react"
import { cx } from "../internal"
import s from "./popover.module.css"

const POPOVER_OFFSET_PX = 8
const DARK_SCHEME = "dark"

export type PopoverProps = {
    open: boolean
    anchor: RefObject<Element | null>
    onClose: () => void
    // Renders the popover in the dark scheme whatever the app theme, for a popover that belongs to a dark surface.
    dark?: boolean
    className?: string
    children: ReactNode
}

export function Popover({ open, anchor, onClose, dark = false, className, children }: PopoverProps) {
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            onClose()
        }
    }

    // The scheme goes on the positioner, so the popup inherits the dark roles and a className on the popup can
    // still redefine a role (its own surface colour) without a specificity contest with the token rule.
    return (
        <BasePopover.Root open={open} onOpenChange={handleOpenChange} modal={false}>
            <BasePopover.Portal>
                <BasePopover.Positioner
                    className={s.positioner}
                    anchor={anchor}
                    side="top"
                    align="end"
                    sideOffset={POPOVER_OFFSET_PX}
                    data-theme={dark ? DARK_SCHEME : undefined}
                >
                    <BasePopover.Popup className={cx(s.popup, className)}>{children}</BasePopover.Popup>
                </BasePopover.Positioner>
            </BasePopover.Portal>
        </BasePopover.Root>
    )
}
