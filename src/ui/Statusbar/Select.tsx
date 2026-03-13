export type SelectProps = {
    value: number
    options: number[]
    className?: string
    onChange: (value: number) => void
}

export function Select({ value, options, className, onChange }: SelectProps) {
    return (
        <select
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className={className}
            style={{
                appearance: "none",
                WebkitAppearance: "none",
                border: "none",
                font: "inherit",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
                borderRadius: 4,
                padding: "0 4px",
            }}
        >
            {options.map(x => (
                <option key={x} value={x}>{x}</option>
            ))}
        </select>
    )
}
