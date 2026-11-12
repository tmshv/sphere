import { IconDisclosure } from "@sphere/icons"
import type { MouseEvent } from "react"
import type { NodeRendererProps } from "react-arborist"
import { ButtonBase, cx } from "../internal"
import s from "./tree-row.module.css"
import type { TreeItem } from "./type"

export const EXPAND_LABEL = "Expand"
export const COLLAPSE_LABEL = "Collapse"
// Same disclosure glyph as a SectionStack header, so the tree's first level lines up under it
const DISCLOSURE_SIZE = 10

function stopPropagation(event: MouseEvent) {
    event.stopPropagation()
}

export function TreeRow({ node, style, dragHandle }: NodeRendererProps<TreeItem>) {
    const { label, icon, extra, children } = node.data
    const hasChildren = (children ?? []).length > 0

    let chevron = <div className={s.chevron} />
    if (hasChildren) {
        // The wrapper keeps a click on the chevron from also selecting the row; the button handles the keyboard.
        chevron = (
            <div className={s.chevron} role="presentation" onClick={stopPropagation}>
                <ButtonBase
                    shape="plain"
                    className={s.chevronButton}
                    label={node.isOpen ? COLLAPSE_LABEL : EXPAND_LABEL}
                    onClick={() => node.toggle()}
                >
                    <IconDisclosure
                        size={DISCLOSURE_SIZE}
                        className={cx(s.chevronIcon, node.isOpen && s.chevronOpen)}
                    />
                </ButtonBase>
            </div>
        )
    }

    return (
        <div
            ref={dragHandle}
            style={style}
            className={cx(s.row, node.isSelected && s.selected)}
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
