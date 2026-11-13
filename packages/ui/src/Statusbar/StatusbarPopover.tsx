import { Popover, type PopoverProps } from "../Popover"
import s from "./statusbar-popover.module.css"

export type StatusbarPopoverProps = Omit<PopoverProps, "dark" | "className">

// A settings popover for a statusbar control. It keeps the statusbar's look in both themes: the near-black
// surface, with the controls inside in the dark scheme.
export function StatusbarPopover({ open, anchor, onClose, children }: StatusbarPopoverProps) {
    return (
        <Popover open={open} anchor={anchor} onClose={onClose} dark className={s.popup}>
            {children}
        </Popover>
    )
}
