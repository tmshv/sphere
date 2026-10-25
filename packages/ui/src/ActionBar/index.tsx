import { Button as BaseButton } from "@base-ui/react/button"
import type { TablerIconProps } from "@tabler/icons"
import type { CSSProperties } from "react"
import iconButton from "../Button/icon-button.module.css"
import { GAP_PX } from "../Layout"
import { unstyledButton } from "../internal"
import s from "./action-bar.module.css"

const PADDED_STYLE: CSSProperties = { paddingLeft: GAP_PX.sm, paddingRight: GAP_PX.sm }
const ICON_SIZE_PX = 16

export type ActionBarItem = {
    name: string
    label: string
    icon: React.FC<TablerIconProps>
    color?: TablerIconProps["color"]
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
        <div className={s.bar} style={padded ? PADDED_STYLE : undefined}>
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
