import { Combobox } from "@base-ui/react/combobox"
import { Select as BaseSelect } from "@base-ui/react/select"
import { type CSSProperties, useId } from "react"
import input from "../internal/input.module.css"
import { ChevronIcon } from "./ChevronIcon"
import s from "./select.module.css"

// Mantine 5 Select, size xs: right section 24px wide.
const RIGHT_SECTION_WIDTH = "24px"
// Mantine 5 Popover: the dropdown sits 8px below the input.
const DROPDOWN_OFFSET_PX = 8

type RightSectionStyle = CSSProperties & { "--right-section-width": string }

const RIGHT_SECTION_STYLE: RightSectionStyle = { "--right-section-width": RIGHT_SECTION_WIDTH }

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

function join(classes: ReadonlyArray<string | undefined>): string {
    return classes.filter(Boolean).join(" ")
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

function PlainSelect({ label, items, selected, onChange, placeholder }: InnerProps) {
    return (
        <BaseSelect.Root items={items} value={selected ? selected.value : null} onValueChange={next => onChange(next)}>
            <div className={input.root}>
                <BaseSelect.Label className={input.label}>{label}</BaseSelect.Label>
                <div className={input.wrapper} style={RIGHT_SECTION_STYLE}>
                    <BaseSelect.Trigger className={join([input.input, input.withRightSection, s.trigger])}>
                        <BaseSelect.Value className={s.value} placeholder={placeholder} />
                    </BaseSelect.Trigger>
                    <div className={join([input.rightSection, s.chevronSection])}>
                        <ChevronIcon />
                    </div>
                </div>
            </div>
            <BaseSelect.Portal>
                <BaseSelect.Positioner
                    className={s.positioner}
                    side="bottom"
                    align="start"
                    sideOffset={DROPDOWN_OFFSET_PX}
                    alignItemWithTrigger={false}
                >
                    <BaseSelect.Popup className={s.dropdown}>
                        <BaseSelect.List className={s.list}>
                            {items.map(item => (
                                <BaseSelect.Item key={item.value} value={item.value} className={s.item}>
                                    <BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
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
                <div className={input.wrapper} style={RIGHT_SECTION_STYLE}>
                    <Combobox.Input
                        id={inputId}
                        className={join([input.input, input.withRightSection, s.trigger])}
                        placeholder={placeholder}
                    />
                    <div className={join([input.rightSection, s.chevronSection])}>
                        <ChevronIcon />
                    </div>
                </div>
            </div>
            <Combobox.Portal>
                <Combobox.Positioner
                    className={s.positioner}
                    side="bottom"
                    align="start"
                    sideOffset={DROPDOWN_OFFSET_PX}
                >
                    <Combobox.Popup className={s.dropdown}>
                        <Combobox.List className={s.list}>
                            {(item: SelectOption) => (
                                <Combobox.Item key={item.value} value={item} className={s.item}>
                                    {item.label}
                                </Combobox.Item>
                            )}
                        </Combobox.List>
                    </Combobox.Popup>
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    )
}
