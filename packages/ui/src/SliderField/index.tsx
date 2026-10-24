import { Input, Slider } from "@mantine/core"

const FIELD_SIZE = "xs"

export type SliderFieldProps = {
    label: string
    value: number
    min: number
    max: number
    step?: number
    onChange: (value: number) => void
}

export function SliderField({ label, value, min, max, step, onChange }: SliderFieldProps) {
    return (
        <Input.Wrapper label={label} size={FIELD_SIZE}>
            <Slider size={FIELD_SIZE} min={min} max={max} step={step} value={value} onChange={onChange} />
        </Input.Wrapper>
    )
}
