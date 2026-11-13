import { Field } from "@base-ui/react/field"
import { Switch } from "@base-ui/react/switch"
import input from "../internal/input.module.css"
import s from "./switch.module.css"

export type SwitchFieldProps = {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
}

export function SwitchField({ label, checked, onChange }: SwitchFieldProps) {
    return (
        <Field.Root className={`${input.root} ${s.root}`}>
            <Field.Label className={s.label}>
                <Switch.Root className={s.track} checked={checked} onCheckedChange={value => onChange(value)}>
                    <Switch.Thumb className={s.thumb} />
                </Switch.Root>
                {label}
            </Field.Label>
        </Field.Root>
    )
}
