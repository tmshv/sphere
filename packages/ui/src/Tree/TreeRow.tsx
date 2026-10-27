import { IconChevronRight } from "@tabler/icons"
import type { MouseEvent } from "react"
import type { NodeRendererProps } from "react-arborist"
import { unstyledButton } from "../internal"
import s from "./tree-row.module.css"
import type { TreeItem } from "./type"

export const EXPAND_LABEL = "Expand"
export const COLLAPSE_LABEL = "Collapse"
// Same chevron as a SectionStack header, so the tree's first level lines up under it
const CHEVRON_SIZE = 14

function stopPropagation(event: MouseEvent) {
    event.stopPropagation()
}

function classNames(...names: Array<string | false | undefined>): string {
    return names.filter(Boolean).join(" ")
}

export function TreeRow({ node, style, dragHandle }: NodeRendererProps<TreeItem>) {
    const { label, icon, extra, children } = node.data
    const hasChildren = (children ?? []).length > 0

    const onChevronClick = (event: MouseEvent) => {
        event.stopPropagation()
        node.toggle()
    }

    let chevron = <div className={s.chevron} />
    if (hasChildren) {
        chevron = (
            <button
                type="button"
                className={classNames(unstyledButton, s.chevron)}
                aria-label={node.isOpen ? COLLAPSE_LABEL : EXPAND_LABEL}
                onClick={onChevronClick}
            >
                <IconChevronRight
                    size={CHEVRON_SIZE}
                    className={classNames(s.chevronIcon, node.isOpen && s.chevronOpen)}
                />
            </button>
        )
    }

    return (
        <div
            ref={dragHandle}
            style={style}
            className={classNames(s.row, node.isSelected && s.selected)}
            data-selected={node.isSelected || undefined}
        >
            <div className={s.content}>
                {chevron}
                {!icon ? null : <div className={s.icon}>{icon}</div>}
                <div className={s.label}>{label}</div>
                {/* A wrapper with no meaning of its own: it only keeps a click on the row's controls
                    from also selecting the row. The controls inside handle the keyboard. */}
                {extra === undefined ? null : (
                    <div role="presentation" onClick={stopPropagation}>
                        {extra}
                    </div>
                )}
            </div>
        </div>
    )
}
