import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import type { ReactNode } from "react"
import { segmented } from "../internal"
import type { SelectOption } from "./Select"

export type SegmentedControlOption = SelectOption & {
    /** Shows the icon alone; the label stays as the accessible name and the tooltip. */
    icon?: ReactNode
}

export type SegmentedControlProps = {
    options: ReadonlyArray<SegmentedControlOption>
    value: string
    onChange: (value: string) => void
    /** Names the group for assistive technology. */
    label: string
    size?: "sm" | "md"
}

export function SegmentedControl({ options, value, onChange, label, size = "md" }: SegmentedControlProps) {
    if (options.length === 0) {
        return null
    }

    return (
        <RadioGroup className={segmented.group} aria-label={label} value={value} onValueChange={next => onChange(next)}>
            {options.map(option => (
                <Radio.Root
                    key={option.value}
                    value={option.value}
                    className={segmented.segment}
                    data-size={size}
                    aria-label={option.icon ? option.label : undefined}
                    title={option.icon ? option.label : undefined}
                >
                    {option.icon ?? <span className={segmented.text}>{option.label}</span>}
                </Radio.Root>
            ))}
        </RadioGroup>
    )
}
