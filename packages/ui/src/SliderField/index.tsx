import { Field } from "@base-ui/react/field"
import { Slider } from "@base-ui/react/slider"
import type { CSSProperties } from "react"
import { input } from "../internal"
import s from "./slider.module.css"

const PERCENT = 100

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
    const barStyle: CSSProperties = { width: `${percentOf(value, min, max)}%` }

    return (
        <Field.Root className={input.root}>
            <div className={s.row}>
                <Field.Label className={input.label}>{label}</Field.Label>
                <span className={s.value}>{value}</span>
            </div>
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
                        <Slider.Thumb className={s.thumb} aria-label={label} />
                    </Slider.Track>
                </Slider.Control>
            </Slider.Root>
        </Field.Root>
    )
}
