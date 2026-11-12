import { Field } from "@base-ui/react/field"
import { Popover } from "@base-ui/react/popover"
import { type CSSProperties, useState } from "react"
import { HsvColorPicker } from "react-colorful"
import { input, menu } from "../internal"
import s from "./color-field.module.css"
import { type Hsv, hexToHsv, hsvToHex, isHex } from "./hex"

// The picker opens just below the colour well.
const POPUP_OFFSET_PX = 4

type SwatchStyle = CSSProperties & { "--swatch-color": string }

export type ColorFieldProps = {
    label: string
    value: string
    onChange: (hex: string) => void
}

// A colour well (a swatch in a bordered frame) that opens the picker, and the hex field beside it.
export function ColorField({ label, value, onChange }: ColorFieldProps) {
    // The picker keeps its own whole-number HSV, so the hue survives greys and the
    // reported hex is always built from the same numbers the thumbs show.
    const [hsv, setHsv] = useState(() => hexToHsv(value))
    const [syncedValue, setSyncedValue] = useState(value)
    // The text being typed into the hex field; null while the field shows the value.
    const [draft, setDraft] = useState<string | null>(null)

    if (value !== syncedValue) {
        setSyncedValue(value)
        if (isHex(value) && value.toLowerCase() !== hsvToHex(hsv)) {
            setHsv(hexToHsv(value))
        }
    }

    function pick(next: Hsv) {
        setHsv(next)
        setDraft(null)
        onChange(hsvToHex(next))
    }

    function type(text: string) {
        if (isHex(text)) {
            pick(hexToHsv(text))
        }
        setDraft(text)
    }

    const swatchStyle: SwatchStyle = { "--swatch-color": value }

    return (
        <Field.Root className={input.root}>
            <Field.Label className={input.label}>{label}</Field.Label>
            <div className={s.row}>
                <Popover.Root>
                    <Popover.Trigger className={s.well} aria-label={`${label} picker`}>
                        <span className={s.swatch} style={swatchStyle} />
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Positioner
                            className={s.positioner}
                            side="bottom"
                            align="start"
                            sideOffset={POPUP_OFFSET_PX}
                        >
                            <Popover.Popup className={menu.surface}>
                                <div className={s.pickerBody}>
                                    <div className={s.picker}>
                                        <HsvColorPicker color={hsv} onChange={pick} />
                                    </div>
                                </div>
                            </Popover.Popup>
                        </Popover.Positioner>
                    </Popover.Portal>
                </Popover.Root>
                <Field.Control
                    className={input.input}
                    value={draft ?? value}
                    onValueChange={type}
                    onBlur={() => setDraft(null)}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                />
            </div>
        </Field.Root>
    )
}
