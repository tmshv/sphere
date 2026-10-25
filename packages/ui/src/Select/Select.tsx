import { Select as MantineSelect } from "@mantine/core"

const FIELD_SIZE = "xs"

export type SelectOption = {
    value: string
    label: string
}

export type SelectOptions = ReadonlyArray<string | SelectOption>

export type SelectProps = {
    label: string
    value: string | null
    options: SelectOptions
    onChange: (value: string | null) => void
    placeholder?: string
    searchable?: boolean
}

export function Select({ label, value, options, onChange, placeholder, searchable }: SelectProps) {
    return (
        <MantineSelect
            size={FIELD_SIZE}
            label={label}
            value={value}
            data={[...options]}
            onChange={onChange}
            placeholder={placeholder}
            searchable={searchable}
        />
    )
}
