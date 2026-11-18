import { Field } from "@base-ui/react/field"
import { Popover } from "@base-ui/react/popover"
import { type CSSProperties, useState } from "react"
import { HsvColorPicker } from "react-colorful"
import { input, menu } from "../internal"
import s from "./color-field.module.css"
import { type Hsv, hexToHsv, hsvToHex, isHex, normalizeHex } from "./hex"

// The picker opens just below the colour well.
const POPUP_OFFSET_PX = 4
const ENTER_KEY = "Enter"

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
    // The last hex this field reported, so the parent echoing it back does not reset the picker.
    const [emitted, setEmitted] = useState(value)
    // The text being typed into the hex field; null while the field shows the value.
    const [draft, setDraft] = useState<string | null>(null)

    if (value !== syncedValue) {
        setSyncedValue(value)
        if (value.toLowerCase() !== emitted) {
            setDraft(null)
            if (isHex(value)) {
                setHsv(hexToHsv(value))
            }
        }
    }

    function emit(hex: string) {
        setEmitted(hex)
        onChange(hex)
    }

    function pick(next: Hsv) {
        setHsv(next)
        setDraft(null)
        emit(hsvToHex(next))
    }

    // Typed text is reported as typed once it is committed, never rounded through the picker's HSV.
    function commit() {
        if (draft !== null && isHex(draft)) {
            const hex = normalizeHex(draft)
            setHsv(hexToHsv(hex))
            emit(hex)
        }
        setDraft(null)
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
                    onValueChange={setDraft}
                    onBlur={commit}
                    onKeyDown={event => event.key === ENTER_KEY && commit()}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                />
            </div>
        </Field.Root>
    )
}
