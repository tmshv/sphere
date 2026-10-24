import type { SelectOption } from "../Select"

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
            className={className}
            style={{
                appearance: "none",
                WebkitAppearance: "none",
                border: "none",
                fontFamily: "monospace",
                fontSize: 10,
                lineHeight: "16px",
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: "0.25px",
                cursor: "pointer",
                outline: "none",
                borderRadius: 4,
                padding: "0 4px",
            }}
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}
