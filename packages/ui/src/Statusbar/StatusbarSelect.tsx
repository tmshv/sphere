import type { SelectOption } from "../Select"
import s from "./statusbar-select.module.css"

export type StatusbarSelectProps = {
    value: string
    options: SelectOption[]
    className?: string
    onChange: (value: string) => void
}

export function StatusbarSelect({ value, options, className, onChange }: StatusbarSelectProps) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className={[s.select, className].filter(Boolean).join(" ")}
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}
