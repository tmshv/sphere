import { Button as BaseButton } from "@base-ui/react/button"
import type { IconComponent, IconProps } from "@sphere/icons"
import iconButton from "../Button/icon-button.module.css"
import { unstyledButton } from "../internal"
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
        <div className={padded ? `${s.bar} ${s.padded}` : s.bar}>
            {items.map((item, i) => {
                if (!item) {
                    return <div key={`separator-before-${items[i + 1]?.name ?? "end"}`} className={s.spacer} />
                }
                const { name, label, icon: Icon, color, disabled = false } = item

                return (
                    <BaseButton
                        key={name}
                        className={[
                            unstyledButton,
                            iconButton.iconButton,
                            iconButton.sizeMd,
                            iconButton.subtle,
                            s.action,
                        ].join(" ")}
                        aria-label={label}
                        disabled={disabled}
                        onClick={() => {
                            onClick(name)
                        }}
                    >
                        <Icon size={ICON_SIZE_PX} color={color} />
                    </BaseButton>
                )
            })}
        </div>
    )
}
