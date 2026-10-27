import { Field } from "@base-ui/react/field"
import { Slider } from "@base-ui/react/slider"
import type { CSSProperties } from "react"
import input from "../internal/input.module.css"
import s from "./slider.module.css"

const PERCENT = 100
// Mantine 5 Slider at size "xs": the bar ends under the thumb centre, so it is one slider size longer.
const BAR_OFFSET_PX = 4

export type SliderFieldProps = {
    label: string
    value: number
    min: number
    max: number
    step?: number
    onChange: (value: number) => void
}

function percentOf(value: number, min: number, max: number): number {
    const clamped = Math.min(Math.max(value, min), max)
    return ((clamped - min) / (max - min)) * PERCENT
}

export function SliderField({ label, value, min, max, step, onChange }: SliderFieldProps) {
    const barStyle: CSSProperties = { width: `calc(${percentOf(value, min, max)}% + ${BAR_OFFSET_PX}px)` }

    return (
        <Field.Root className={input.root}>
            <Field.Label className={input.label}>{label}</Field.Label>
            <Slider.Root
                min={min}
                max={max}
                step={step}
                value={value}
                thumbAlignment="center"
                onValueChange={newValue => onChange(newValue)}
            >
                <Slider.Control className={s.control}>
                    <Slider.Track className={s.track}>
                        <div className={s.bar} style={barStyle} />
                        <Slider.Thumb className={s.thumb} aria-label={label}>
                            <div className={s.label} aria-hidden>
                                {value}
                            </div>
                        </Slider.Thumb>
                    </Slider.Track>
                </Slider.Control>
            </Slider.Root>
        </Field.Root>
    )
}
