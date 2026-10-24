import { SegmentedControl as MantineSegmentedControl } from "@mantine/core"
import type { SelectOption } from "./Select"

const CONTROL_SIZE = "xs"
const RADIO_GROUP_ROLE = "radiogroup"

export type SegmentedControlProps = {
    options: ReadonlyArray<SelectOption>
    value: string
    onChange: (value: string) => void
    /** Names the group for assistive technology. */
    label: string
}

export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
    return (
        <MantineSegmentedControl
            size={CONTROL_SIZE}
            data={[...options]}
            value={value}
            onChange={onChange}
            role={RADIO_GROUP_ROLE}
            aria-label={label}
        />
    )
}
