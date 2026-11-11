import { Popover as BasePopover } from "@base-ui/react/popover"
import type { ReactNode, RefObject } from "react"
import s from "./popover.module.css"

const POPOVER_OFFSET_PX = 8

export type PopoverProps = {
    open: boolean
    anchor: RefObject<Element | null>
    onClose: () => void
    children: ReactNode
}

export function Popover({ open, anchor, onClose, children }: PopoverProps) {
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            onClose()
        }
    }

    return (
        <BasePopover.Root open={open} onOpenChange={handleOpenChange} modal={false}>
            <BasePopover.Portal>
                <BasePopover.Positioner
                    className={s.positioner}
                    anchor={anchor}
                    side="top"
                    align="end"
                    sideOffset={POPOVER_OFFSET_PX}
                >
                    <BasePopover.Popup className={s.popup}>{children}</BasePopover.Popup>
                </BasePopover.Positioner>
            </BasePopover.Portal>
        </BasePopover.Root>
    )
}
