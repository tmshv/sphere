import { IconSelector } from "@sphere/icons"
import { cx } from "../internal"
import type { SelectOption } from "../Select"
import s from "./statusbar-select.module.css"

// The statusbar glyph size, as on its buttons.
const CHEVRON_SIZE_PX = 12

export type StatusbarSelectProps = {
    value: string
    options: SelectOption[]
    className?: string
    onChange: (value: string) => void
}

export function StatusbarSelect({ value, options, className, onChange }: StatusbarSelectProps) {
    const label = options.find(option => option.value === value)?.label ?? value

    // The visible value sizes the control; the native select lies transparently over it and takes the input.
    return (
        <span className={s.root}>
            <span className={s.value}>{label}</span>
            <IconSelector size={CHEVRON_SIZE_PX} aria-hidden="true" />
            <select value={value} onChange={e => onChange(e.target.value)} className={cx(s.select, className)}>
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </span>
    )
}
