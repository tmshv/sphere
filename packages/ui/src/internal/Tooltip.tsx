import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import type { CSSProperties, ReactElement } from "react"
import s from "./Tooltip.module.css"

export type TooltipSide = "top" | "right" | "bottom" | "left"

const DEFAULT_SIDE: TooltipSide = "top"
const DEFAULT_DELAY_MS = 0
const DEFAULT_CLOSE_DELAY_MS = 0
// Mantine 5 Tooltip fades in over 100ms.
const DEFAULT_DURATION_MS = 100
// Mantine 5 Tooltip: offset 5, plus half the arrow size (4) when the arrow shows.
const OFFSET_PX = 5
const ARROW_OFFSET_PX = 2
// Mantine 5 Tooltip keeps 8px from the viewport edge (shift padding).
const COLLISION_PADDING_PX = 8

export type TooltipProps = {
    label: string
    side?: TooltipSide
    delay?: number
    closeDelay?: number
    /** Fade duration in milliseconds. */
    duration?: number
    disabled?: boolean
    /** Shows the little pointer, as Mantine's `withArrow`. */
    arrow?: boolean
    children: ReactElement
}

type DurationStyle = CSSProperties & { "--tooltip-duration": string }

export function Tooltip({
    label,
    side = DEFAULT_SIDE,
    delay = DEFAULT_DELAY_MS,
    closeDelay = DEFAULT_CLOSE_DELAY_MS,
    duration = DEFAULT_DURATION_MS,
    disabled = false,
    arrow = false,
    children,
}: TooltipProps) {
    const style: DurationStyle = { "--tooltip-duration": `${duration}ms` }

    return (
        <BaseTooltip.Root disabled={disabled}>
            <BaseTooltip.Trigger render={children} delay={delay} closeDelay={closeDelay} />
            <BaseTooltip.Portal>
                <BaseTooltip.Positioner
                    className={s.positioner}
                    side={side}
                    sideOffset={OFFSET_PX + (arrow ? ARROW_OFFSET_PX : 0)}
                    collisionPadding={COLLISION_PADDING_PX}
                >
                    <BaseTooltip.Popup className={s.tooltip} style={style}>
                        {label}
                        {arrow ? <BaseTooltip.Arrow className={s.arrow} /> : null}
                    </BaseTooltip.Popup>
                </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
        </BaseTooltip.Root>
    )
}
