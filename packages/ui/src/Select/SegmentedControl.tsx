import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import s from "./segmented-control.module.css"
import type { SelectOption } from "./Select"

export type SegmentedControlProps = {
    options: ReadonlyArray<SelectOption>
    value: string
    onChange: (value: string) => void
    /** Names the group for assistive technology. */
    label: string
}

export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
    if (options.length === 0) {
        return null
    }

    return (
        <RadioGroup className={s.root} aria-label={label} value={value} onValueChange={next => onChange(next)}>
            {options.map(option => {
                const active = option.value === value
                return (
                    <div key={option.value} className={active ? `${s.control} ${s.controlActive}` : s.control}>
                        <Radio.Root value={option.value} className={s.label}>
                            {option.label}
                        </Radio.Root>
                    </div>
                )
            })}
        </RadioGroup>
    )
}
