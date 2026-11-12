import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import type { CSSProperties, ReactElement } from "react"
import { duration as durationScale } from "../tokens"
import s from "./Tooltip.module.css"

export type TooltipSide = "top" | "right" | "bottom" | "left"

const DEFAULT_SIDE: TooltipSide = "top"
// A desktop tooltip waits before it opens (--sphere-duration-tooltip-delay).
const DEFAULT_DELAY_MS = durationScale.tooltipDelay
const DEFAULT_CLOSE_DELAY_MS = 0
// It appears instantly and fades out over duration-fast.
const DEFAULT_DURATION_MS = durationScale.fast
// The gap to the trigger, and the margin it keeps from the window edges.
const OFFSET_PX = 4
const COLLISION_PADDING_PX = 4

export type TooltipProps = {
    label: string
    side?: TooltipSide
    delay?: number
    closeDelay?: number
    /** Fade-out duration in milliseconds. */
    duration?: number
    disabled?: boolean
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
                    sideOffset={OFFSET_PX}
                    collisionPadding={COLLISION_PADDING_PX}
                >
                    <BaseTooltip.Popup className={s.tooltip} style={style} role="tooltip">
                        {label}
                    </BaseTooltip.Popup>
                </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
        </BaseTooltip.Root>
    )
}
