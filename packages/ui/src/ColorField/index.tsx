import { Field } from "@base-ui/react/field"
import { useState } from "react"
import { HsvColorPicker } from "react-colorful"
import { Badge } from "../internal"
import input from "../internal/input.module.css"
import s from "./color-field.module.css"
import { hexToHsv, hsvToHex, isHex } from "./hex"

export type ColorFieldProps = {
    label: string
    value: string
    onChange: (hex: string) => void
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
    // Like Mantine, the picker keeps its own whole-number HSV, so the hue survives
    // greys and the reported hex is always built from the same numbers the thumbs show.
    const [hsv, setHsv] = useState(() => hexToHsv(value))
    const [syncedValue, setSyncedValue] = useState(value)

    if (value !== syncedValue) {
        setSyncedValue(value)
        if (isHex(value) && value.toLowerCase() !== hsvToHex(hsv)) {
            setHsv(hexToHsv(value))
        }
    }

    return (
        <Field.Root className={input.root}>
            <Field.Label className={input.label}>
                {label}
                <Badge className={s.badge} size="xs" variant="light" radius="sm">
                    {value}
                </Badge>
            </Field.Label>
            <div className={s.picker}>
                <HsvColorPicker
                    color={hsv}
                    onChange={next => {
                        setHsv(next)
                        onChange(hsvToHex(next))
                    }}
                />
            </div>
        </Field.Root>
    )
}
