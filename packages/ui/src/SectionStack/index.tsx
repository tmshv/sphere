import { IconChevronRight } from "@sphere/icons"
import { Children, isValidElement, useCallback, useEffect, useId, useRef } from "react"
import { unstyledButton } from "../internal"
import { SplitPane, SplitView, type SplitViewHandle } from "../Split"
import { restoreSize } from "../Split/sizes"
import { defaultSizesOf, isSpacerVisible, mergeSections, resolveSections, SPACER_MIN_SIZE } from "./layout"
import s from "./section-stack.module.css"

// Also declared as --header-height in section-stack.module.css; a test pins them together.
export const SECTION_HEADER_HEIGHT = 30
const DEFAULT_MIN_CONTENT_SIZE = 120
const CHEVRON_SIZE = 14

export type SectionProps = {
    name: string
    title: string
    minContentSize?: number
    // Drops the body's vertical padding, for a child that scrolls edge to
    // edge and carries its own inset, such as an outline tree.
    flush?: boolean
    children: React.ReactNode
}

// Section is a declaration, not a renderer: SectionStack reads its props and
// draws the pane itself. Rendering the children keeps it valid if it is ever
// used on its own.
export function Section({ children }: SectionProps) {
    return <>{children}</>
}

function isSection(node: React.ReactNode): node is React.ReactElement<SectionProps> {
    return isValidElement<SectionProps>(node) && node.type === Section
}

export type SectionLayout = {
    name: string
    open: boolean
    size: number | null
}

export type SectionStackProps = {
    sections: SectionLayout[]
    onSectionsChange: (sections: SectionLayout[]) => void
    children: React.ReactNode
}

// resolveSections guarantees one entry per name in the list it was given, in
// the same order, so a lookup against a resolved array built from the exact
// same names can never actually miss. This fallback exists only to satisfy
// the type system without an unguarded index/non-null assertion.
function layoutOf(resolved: SectionLayout[], name: string): SectionLayout {
    const found = resolved.find(section => section.name === name)
    if (found !== undefined) {
        return found
    }

    return { name, open: true, size: null }
}

function SectionStackRoot({ sections: rows, onSectionsChange, children }: SectionStackProps) {
    const baseId = useId()
    const handle = useRef<SplitViewHandle>(null)
    const sizes = useRef<number[]>([])
    const pending = useRef<string | null>(null)

    const renderedSections = Children.toArray(children).filter(isSection)
    const resolved = resolveSections(
        rows,
        renderedSections.map(section => section.props.name),
    )

    const minSizeOf = (section: React.ReactElement<SectionProps>) => {
        const layout = layoutOf(resolved, section.props.name)
        if (!layout.open) {
            return SECTION_HEADER_HEIGHT
        }

        return SECTION_HEADER_HEIGHT + (section.props.minContentSize ?? DEFAULT_MIN_CONTENT_SIZE)
    }

    // renderedSections and minSizeOf are rebuilt every render, so the effect
    // below cannot depend on them directly without re-running on every
    // render. It reads them from this ref, which is assigned on each render,
    // and keys off `rows` instead — the only input that actually changes
    // when a section opens or closes.
    const latest = useRef({ renderedSections, minSizeOf })
    latest.current = { renderedSections, minSizeOf }

    const onSplitChange = useCallback(
        (next: number[]) => {
            sizes.current = next

            const { renderedSections: currentSections } = latest.current
            const currentResolved = resolveSections(
                rows,
                currentSections.map(section => section.props.name),
            )

            const changedLayouts = currentResolved.flatMap((layout, index) => {
                if (!layout.open) {
                    return []
                }

                const height = next.at(index)
                if (height === undefined || height === layout.size) {
                    return []
                }

                return [{ ...layout, size: height }]
            })

            if (changedLayouts.length > 0) {
                onSectionsChange(mergeSections(rows, changedLayouts))
            }
        },
        [rows, onSectionsChange],
    )

    // A reopened pane only grows to its minimum, so the size it had before it
    // was closed is reapplied once the new minimums have been laid out.
    useEffect(() => {
        const target = pending.current
        pending.current = null
        if (target === null) {
            return
        }

        const { renderedSections: currentSections, minSizeOf: currentMinSizeOf } = latest.current
        const currentResolved = resolveSections(
            rows,
            currentSections.map(section => section.props.name),
        )

        const index = currentSections.findIndex(section => section.props.name === target)
        const targetLayout = index < 0 ? undefined : currentResolved.at(index)
        if (targetLayout === undefined || !targetLayout.open || targetLayout.size === null) {
            return
        }

        if (sizes.current.length < currentSections.length) {
            return
        }

        // allotment reports a size for every pane it has ever laid out,
        // including the trailing spacer, so sizes.current is one entry
        // longer than currentSections. minSizes must line up with
        // sizes.current by index, so the spacer's own zero minimum is
        // appended explicitly here rather than left to restoreSize's
        // internal `?? 0` default for a missing entry.
        const minSizes = [...currentSections.map(currentMinSizeOf), SPACER_MIN_SIZE]

        handle.current?.resize(restoreSize(sizes.current, index, targetLayout.size, minSizes))
    }, [rows])

    const toggle = (section: React.ReactElement<SectionProps>) => {
        const name = section.props.name
        const layout = layoutOf(resolved, name)

        if (layout.open) {
            const index = renderedSections.indexOf(section)
            const height = sizes.current.at(index)

            const closedLayout = { ...layout, open: false, size: height ?? layout.size }
            onSectionsChange(mergeSections(rows, [closedLayout]))
            return
        }

        pending.current = name
        const openLayout = { ...layout, open: true }
        onSectionsChange(mergeSections(rows, [openLayout]))
    }

    const spacerVisible = isSpacerVisible(resolved)
    const defaultSizes = defaultSizesOf(resolved, SECTION_HEADER_HEIGHT)

    return (
        <SplitView vertical ref={handle} className={s.root} onChange={onSplitChange} defaultSizes={defaultSizes}>
            {renderedSections.map(section => {
                const layout = layoutOf(resolved, section.props.name)
                const open = layout.open
                const bodyId = `${baseId}-${section.props.name}`

                return (
                    <SplitPane
                        key={section.props.name}
                        minSize={minSizeOf(section)}
                        // allotment only writes maximumSize when the incoming prop is not
                        // undefined, so passing undefined here would leave a previously
                        // closed section's maximumSize pinned at SECTION_HEADER_HEIGHT
                        // forever. Infinity is a real value that clears it.
                        maxSize={open ? Number.POSITIVE_INFINITY : SECTION_HEADER_HEIGHT}
                    >
                        <div className={s.section}>
                            <button
                                type={"button"}
                                className={`${unstyledButton} ${s.header}`}
                                onClick={() => toggle(section)}
                                aria-expanded={open}
                                aria-controls={open ? bodyId : undefined}
                            >
                                <IconChevronRight
                                    className={open ? `${s.chevron} ${s.chevronOpen}` : s.chevron}
                                    size={CHEVRON_SIZE}
                                />
                                <span>{section.props.title}</span>
                            </button>

                            {!open ? null : (
                                <div id={bodyId} className={section.props.flush ? `${s.body} ${s.flush}` : s.body}>
                                    {section.props.children}
                                </div>
                            )}
                        </div>
                    </SplitPane>
                )
            })}

            {/* With every section pinned to its header, nothing is willing to
                absorb the leftover height. This takes it, so no header
                stretches to fill the gap. */}
            <SplitPane visible={spacerVisible} minSize={SPACER_MIN_SIZE}>
                {null}
            </SplitPane>
        </SplitView>
    )
}

export const SectionStack = Object.assign(SectionStackRoot, { Section })
