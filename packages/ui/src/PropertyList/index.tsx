import { IconCheck, IconCopy } from "@sphere/icons"
import { isUrl } from "@sphere/utils"
import { type MouseEvent, useState } from "react"
import { IconButton } from "../Button"
import { ContextMenu, ContextMenuItem } from "../ContextMenu"
import { Tooltip, ValueImage } from "../internal"
import s from "./property-list.module.css"
import { type CopyResult, useCopy } from "./useCopy"

const GLYPH_SIZE = 14

export const COPY_LABEL = "Copy"
export const COPIED_LABEL = "Copied!"
export const COPY_FAILED_LABEL = "Copy failed"
export const COPY_VALUE_LABEL = "Copy Value"
export const COPY_NAME_LABEL = "Copy Name"
export const COPY_PAIR_LABEL = "Copy Name and Value"

/** One pair. Names are unique within a list. */
export type PropertyListItem = {
    name: string
    value: string | number
}

export type PropertyListProps = {
    items: ReadonlyArray<PropertyListItem>
    /** A copy glyph on every row and a right-click menu to copy the value, the name or both (default true). */
    copyable?: boolean
    /** Shows a value that is a URL as the image it points at. */
    checkUrls?: boolean
}

type Menu = { item: PropertyListItem; position: [number, number] }

/** The text a pair copies as, by Copy Name and Value. */
export function pairText({ name, value }: PropertyListItem): string {
    return `${name}: ${value}`
}

function glyphLabel(name: string, result: CopyResult | null): string {
    if (result?.name !== name) {
        return COPY_LABEL
    }
    return result.status === "copied" ? COPIED_LABEL : COPY_FAILED_LABEL
}

/** Name and value pairs with every value on one column: feature properties, source details, field statistics. */
export function PropertyList({ items, copyable = true, checkUrls = false }: PropertyListProps) {
    const { result, copy } = useCopy()
    const [menu, setMenu] = useState<Menu | null>(null)

    const openMenu = (event: MouseEvent, item: PropertyListItem) => {
        if (!copyable) {
            return
        }
        event.preventDefault()
        setMenu({ item, position: [event.clientX, event.clientY] })
    }

    const copyFromMenu = (text: string) => {
        if (menu) {
            copy(menu.item.name, text)
        }
        setMenu(null)
    }

    return (
        <>
            <dl className={s.list}>
                {items.map(item => {
                    const text = String(item.value)
                    const label = glyphLabel(item.name, result)
                    const copied = label === COPIED_LABEL

                    return (
                        <div key={item.name} className={s.row} onContextMenu={event => openMenu(event, item)}>
                            <dt className={s.name}>{item.name}</dt>
                            <dd className={s.value}>
                                {checkUrls && isUrl(text) ? (
                                    <ValueImage src={text} alt={item.name} size="large" />
                                ) : (
                                    <span className={s.text}>{text}</span>
                                )}
                                {!copyable ? null : (
                                    <Tooltip label={label}>
                                        <span className={s.copy}>
                                            <IconButton
                                                size="sm"
                                                icon={
                                                    copied ? (
                                                        <IconCheck size={GLYPH_SIZE} />
                                                    ) : (
                                                        <IconCopy size={GLYPH_SIZE} />
                                                    )
                                                }
                                                label={label}
                                                nativeTooltip={false}
                                                onClick={() => copy(item.name, text)}
                                            />
                                        </span>
                                    </Tooltip>
                                )}
                            </dd>
                        </div>
                    )
                })}
            </dl>
            {!menu ? null : (
                <ContextMenu opened position={menu.position} onClose={() => setMenu(null)}>
                    <ContextMenuItem onClick={() => copyFromMenu(String(menu.item.value))}>
                        {COPY_VALUE_LABEL}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => copyFromMenu(menu.item.name)}>{COPY_NAME_LABEL}</ContextMenuItem>
                    <ContextMenuItem onClick={() => copyFromMenu(pairText(menu.item))}>
                        {COPY_PAIR_LABEL}
                    </ContextMenuItem>
                </ContextMenu>
            )}
        </>
    )
}
