import { Combobox } from "@base-ui/react/combobox"
import { Select as BaseSelect } from "@base-ui/react/select"
import { IconCheck } from "@sphere/icons"
import { useId } from "react"
import { cx, input, menu } from "../internal"
import { ChevronIcon } from "./ChevronIcon"
import s from "./select.module.css"

// The list opens just below the button.
const POPUP_OFFSET_PX = 4
const CHECK_SIZE_PX = 12

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

function toOption(option: string | SelectOption): SelectOption {
    return typeof option === "string" ? { value: option, label: option } : option
}

export function Select({ label, value, options, onChange, placeholder, searchable }: SelectProps) {
    const items = options.map(toOption)
    const selected = items.find(item => item.value === value) ?? null

    if (searchable) {
        return (
            <SearchableSelect
                label={label}
                items={items}
                selected={selected}
                onChange={onChange}
                placeholder={placeholder}
            />
        )
    }

    return <PlainSelect label={label} items={items} selected={selected} onChange={onChange} placeholder={placeholder} />
}

type InnerProps = {
    label: string
    items: ReadonlyArray<SelectOption>
    selected: SelectOption | null
    onChange: (value: string | null) => void
    placeholder?: string
}

function Check() {
    return <IconCheck size={CHECK_SIZE_PX} />
}

// A pop-up button: the push-button body with the value on the left and a double chevron on the right. Its list is
// the menu surface with a check on the current value.
function PlainSelect({ label, items, selected, onChange, placeholder }: InnerProps) {
    return (
        <BaseSelect.Root items={items} value={selected ? selected.value : null} onValueChange={next => onChange(next)}>
            <div className={input.root}>
                <BaseSelect.Label className={input.label}>{label}</BaseSelect.Label>
                <BaseSelect.Trigger className={s.trigger}>
                    <BaseSelect.Value className={s.value} placeholder={placeholder} />
                    <BaseSelect.Icon className={s.glyph}>
                        <ChevronIcon />
                    </BaseSelect.Icon>
                </BaseSelect.Trigger>
            </div>
            <BaseSelect.Portal>
                <BaseSelect.Positioner
                    className={s.positioner}
                    side="bottom"
                    align="start"
                    sideOffset={POPUP_OFFSET_PX}
                    alignItemWithTrigger={false}
                >
                    <BaseSelect.Popup className={cx(menu.surface, s.popup)}>
                        <BaseSelect.List className={s.list}>
                            {items.map(item => (
                                <BaseSelect.Item key={item.value} value={item.value} className={menu.item}>
                                    <BaseSelect.ItemIndicator className={menu.itemCheck}>
                                        <Check />
                                    </BaseSelect.ItemIndicator>
                                    <BaseSelect.ItemText className={menu.itemLabel}>{item.label}</BaseSelect.ItemText>
                                </BaseSelect.Item>
                            ))}
                        </BaseSelect.List>
                    </BaseSelect.Popup>
                </BaseSelect.Positioner>
            </BaseSelect.Portal>
        </BaseSelect.Root>
    )
}

function isSameOption(a: SelectOption, b: SelectOption): boolean {
    return a.value === b.value
}

function optionLabel(option: SelectOption): string {
    return option.label
}

// The searchable variant types into the pop-up button body; the list filters as it is typed into.
function SearchableSelect({ label, items, selected, onChange, placeholder }: InnerProps) {
    const inputId = useId()

    return (
        <Combobox.Root
            items={items}
            value={selected}
            onValueChange={next => onChange(next ? next.value : null)}
            isItemEqualToValue={isSameOption}
            itemToStringLabel={optionLabel}
            openOnInputClick
        >
            <div className={input.root}>
                <label className={input.label} htmlFor={inputId}>
                    {label}
                </label>
                <div className={s.field}>
                    <Combobox.Input id={inputId} className={cx(s.trigger, s.search)} placeholder={placeholder} />
                    <span className={cx(s.glyph, s.searchGlyph)}>
                        <ChevronIcon />
                    </span>
                </div>
            </div>
            <Combobox.Portal>
                <Combobox.Positioner className={s.positioner} side="bottom" align="start" sideOffset={POPUP_OFFSET_PX}>
                    <Combobox.Popup className={cx(menu.surface, s.popup)}>
                        <Combobox.List className={s.list}>
                            {(item: SelectOption) => (
                                <Combobox.Item key={item.value} value={item} className={menu.item}>
                                    <Combobox.ItemIndicator className={menu.itemCheck}>
                                        <Check />
                                    </Combobox.ItemIndicator>
                                    <span className={menu.itemLabel}>{item.label}</span>
                                </Combobox.Item>
                            )}
                        </Combobox.List>
                    </Combobox.Popup>
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    )
}
