import { TextInput } from "@mantine/core"
import type { ReactNode } from "react"

const FIELD_SIZE = "xs"
const NO_AUTOCORRECT = "off"
const NO_AUTOCAPITALIZE = "none"

export type TextFieldProps = {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    error?: string
    required?: boolean
    name?: string
    /** Turns off autocorrect, autocapitalize and spellcheck, for expressions and identifiers. */
    code?: boolean
    rightSection?: ReactNode
    onBlur?: () => void
}

export function TextField({
    label,
    value,
    onChange,
    placeholder,
    error,
    required,
    name,
    code = false,
    rightSection,
    onBlur,
}: TextFieldProps) {
    return (
        <TextInput
            size={FIELD_SIZE}
            label={label}
            value={value}
            onChange={event => onChange(event.currentTarget.value)}
            placeholder={placeholder}
            error={error}
            required={required}
            withAsterisk={required}
            name={name}
            autoCorrect={code ? NO_AUTOCORRECT : undefined}
            autoCapitalize={code ? NO_AUTOCAPITALIZE : undefined}
            spellCheck={code ? false : undefined}
            rightSection={rightSection}
            onBlur={() => onBlur?.()}
        />
    )
}
