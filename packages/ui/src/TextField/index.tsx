import { Field } from "@base-ui/react/field"
import type { CSSProperties, ReactNode } from "react"
import input from "../internal/input.module.css"

const NO_AUTOCORRECT = "off"
const NO_AUTOCAPITALIZE = "none"
// Mantine 5 Input: rightSectionWidth defaults to 36.
const RIGHT_SECTION_WIDTH = "36px"
const REQUIRED_MARK = " *"

type RightSectionStyle = CSSProperties & { "--right-section-width": string }

const RIGHT_SECTION_STYLE: RightSectionStyle = { "--right-section-width": RIGHT_SECTION_WIDTH }

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
    const invalid = Boolean(error)
    const hasRightSection = Boolean(rightSection)
    const wrapperClasses = [input.wrapper, invalid ? input.wrapperWithError : undefined]
    const inputClasses = [
        input.input,
        invalid ? input.invalid : undefined,
        hasRightSection ? input.withRightSection : undefined,
    ]

    return (
        <Field.Root className={input.root} invalid={invalid} name={name}>
            <Field.Label className={input.label}>
                {label}
                {required ? (
                    <span className={input.required} aria-hidden>
                        {REQUIRED_MARK}
                    </span>
                ) : null}
            </Field.Label>
            <div className={wrapperClasses.filter(Boolean).join(" ")} style={RIGHT_SECTION_STYLE}>
                <Field.Control
                    className={inputClasses.filter(Boolean).join(" ")}
                    value={value}
                    onValueChange={newValue => onChange(newValue)}
                    placeholder={placeholder}
                    required={required}
                    autoCorrect={code ? NO_AUTOCORRECT : undefined}
                    autoCapitalize={code ? NO_AUTOCAPITALIZE : undefined}
                    spellCheck={code ? false : undefined}
                    onBlur={() => onBlur?.()}
                />
                {hasRightSection ? <div className={input.rightSection}>{rightSection}</div> : null}
            </div>
            {invalid ? (
                <Field.Error className={input.error} match>
                    {error}
                </Field.Error>
            ) : null}
        </Field.Root>
    )
}
