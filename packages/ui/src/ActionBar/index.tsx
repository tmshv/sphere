import type { IconComponent, IconProps } from "@sphere/icons"
import { IconButton } from "../Button"
import { cx } from "../internal"
import s from "./action-bar.module.css"

const ICON_SIZE_PX = 16

export type ActionBarItem = {
    name: string
    label: string
    icon: IconComponent
    color?: IconProps["color"]
    disabled?: boolean
}

export type ActionBarOnClick = (name: string) => void

export type ActionBarProps = {
    items: Array<ActionBarItem | null>
    onClick: ActionBarOnClick
    /** Insets the bar horizontally by the standard gap. */
    padded?: boolean
}

export function ActionBar({ items, onClick, padded = false }: ActionBarProps) {
    return (
        <div className={cx(s.bar, padded && s.padded)}>
            {items.map((item, i) => {
                if (!item) {
                    return <div key={`separator-before-${items.at(i + 1)?.name ?? "end"}`} className={s.spacer} />
                }
                const { name, label, icon: Icon, color, disabled = false } = item

                return (
                    <IconButton
                        key={name}
                        icon={<Icon size={ICON_SIZE_PX} color={color} />}
                        label={label}
                        disabled={disabled}
                        onClick={() => {
                            onClick(name)
                        }}
                    />
                )
            })}
        </div>
    )
}
