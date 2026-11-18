import { Field } from "@base-ui/react/field"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import input from "../internal/input.module.css"
import type { SelectOption } from "../Select"
import s from "./radio-list.module.css"

export type RadioListFieldProps = {
    label: string
    value: string | undefined
    options: SelectOption[]
    onChange: (value: string) => void
}

export function RadioListField({ label, value, options, onChange }: RadioListFieldProps) {
    return (
        <Field.Root className={input.root}>
            <Field.Label className={input.label} nativeLabel={false} render={<div />}>
                {label}
            </Field.Label>
            <RadioGroup
                className={s.group}
                aria-label={label}
                value={value ?? null}
                onValueChange={next => onChange(String(next))}
            >
                {options.map(option => (
                    <Field.Item key={option.value}>
                        <Field.Label className={s.row}>
                            <Radio.Root className={s.radio} value={option.value}>
                                <Radio.Indicator className={s.indicator} />
                            </Radio.Root>
                            {option.label}
                        </Field.Label>
                    </Field.Item>
                ))}
            </RadioGroup>
        </Field.Root>
    )
}
