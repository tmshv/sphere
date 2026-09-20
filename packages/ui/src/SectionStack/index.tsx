import { UnstyledButton, createStyles } from "@mantine/core"
import { IconChevronRight } from "@tabler/icons"
import { Children, isValidElement, useCallback, useEffect, useId, useRef } from "react"
import { SplitPane, SplitView, type SplitViewHandle } from "../Split"
import { restoreSize } from "../Split/sizes"

export const SECTION_HEADER_HEIGHT = 30
const DEFAULT_MIN_CONTENT_SIZE = 120
const CHEVRON_SIZE = 14
const SPACER_MIN_SIZE = 0

export type SectionProps = {
    name: string
    title: string
    minContentSize?: number
    children: React.ReactNode
}

// Section is a declaration, not a renderer: SectionStack reads its props and
// draws the pane itself. Rendering the children keeps it valid if it is ever
// used on its own.
export const Section: React.FC<SectionProps> = ({ children }) => <>{children}</>

function isSection(node: React.ReactNode): node is React.ReactElement<SectionProps> {
    return isValidElement<SectionProps>(node) && node.type === Section
}

function isNumber(value: number | null): value is number {
    return value !== null
}

const useStyles = createStyles(theme => ({
    root: {
        flex: "1 1 0",
        minHeight: 0,
    },
    section: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
    },
    header: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        height: SECTION_HEADER_HEIGHT,
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.sm,
        fontSize: theme.fontSizes.sm,
        color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.colors.gray[9],
        backgroundColor: theme.colorScheme === "dark" ? theme.colors.gray[9] : theme.white,
        borderTop: `1px solid ${theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[3]}`,
        ...theme.fn.focusStyles(),
    },
    chevron: {
        flexShrink: 0,
        transition: "transform 150ms ease",
    },
    chevronOpen: {
        transform: "rotate(90deg)",
    },
    body: {
        flex: "1 1 auto",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
    },
}))

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

const DEFAULT_LAYOUT = { open: true, size: null } as const

function layoutOf(sections: SectionLayout[], name: string): SectionLayout {
    const row = sections.find(section => section.name === name)
    if (row !== undefined) {
        return row
    }

    return { name, ...DEFAULT_LAYOUT }
}

const SectionStackRoot: React.FC<SectionStackProps> = ({ sections: rows, onSectionsChange, children }) => {
    const { classes: s, cx } = useStyles()
    const baseId = useId()
    const handle = useRef<SplitViewHandle>(null)
    const sizes = useRef<number[]>([])
    const pending = useRef<string | null>(null)

    const renderedSections = Children.toArray(children).filter(isSection)
    const minSizeOf = (section: React.ReactElement<SectionProps>) => {
        const layout = layoutOf(rows, section.props.name)
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
            let changed = false
            const nextRows = rows.map(row => {
                if (!row.open) {
                    return row
                }

                const index = currentSections.findIndex(section => section.props.name === row.name)
                const height = index < 0 ? undefined : next.at(index)
                if (height === undefined || height === row.size) {
                    return row
                }

                changed = true
                return { ...row, size: height }
            })

            if (changed) {
                onSectionsChange(nextRows)
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

        const targetRow = rows.find(row => row.name === target)
        if (targetRow === undefined || !targetRow.open || targetRow.size === null) {
            return
        }

        const { renderedSections: currentSections, minSizeOf: currentMinSizeOf } = latest.current
        const index = currentSections.findIndex(section => section.props.name === target)
        if (index < 0 || sizes.current.length < currentSections.length) {
            return
        }

        // allotment reports a size for every pane it has ever laid out,
        // including the trailing spacer, so sizes.current is one entry
        // longer than currentSections. minSizes must line up with
        // sizes.current by index, so the spacer's own zero minimum is
        // appended explicitly here rather than left to restoreSize's
        // internal `?? 0` default for a missing entry.
        const minSizes = [...currentSections.map(currentMinSizeOf), SPACER_MIN_SIZE]

        handle.current?.resize(restoreSize(sizes.current, index, targetRow.size, minSizes))
    }, [rows])

    const toggle = (section: React.ReactElement<SectionProps>) => {
        const name = section.props.name
        const layout = layoutOf(rows, name)

        if (layout.open) {
            const index = renderedSections.indexOf(section)
            const height = sizes.current.at(index)

            const closedRow = { ...layout, open: false, size: height ?? layout.size }
            const nextRows = rows.some(row => row.name === name)
                ? rows.map(row => (row.name === name ? closedRow : row))
                : [...rows, closedRow]

            onSectionsChange(nextRows)
            return
        }

        pending.current = name
        const openRow = { ...layout, open: true }
        const nextRows = rows.some(row => row.name === name)
            ? rows.map(row => (row.name === name ? openRow : row))
            : [...rows, openRow]

        onSectionsChange(nextRows)
    }

    const allClosed = renderedSections.every(section => !layoutOf(rows, section.props.name).open)

    const openSizes = renderedSections.map(section => {
        const layout = layoutOf(rows, section.props.name)
        return layout.open ? layout.size : SECTION_HEADER_HEIGHT
    })
    const defaultSizes = openSizes.every(isNumber) ? [...openSizes, SPACER_MIN_SIZE] : undefined

    return (
        <SplitView vertical ref={handle} className={s.root} onChange={onSplitChange} defaultSizes={defaultSizes}>
            {renderedSections.map(section => {
                const layout = layoutOf(rows, section.props.name)
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
                            <UnstyledButton
                                className={s.header}
                                onClick={() => toggle(section)}
                                aria-expanded={open}
                                aria-controls={open ? bodyId : undefined}
                            >
                                <IconChevronRight
                                    className={cx(s.chevron, { [s.chevronOpen]: open })}
                                    size={CHEVRON_SIZE}
                                />
                                <span>{section.props.title}</span>
                            </UnstyledButton>

                            {!open ? null : (
                                <div id={bodyId} className={s.body}>
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
            <SplitPane visible={allClosed} minSize={SPACER_MIN_SIZE}>
                {null}
            </SplitPane>
        </SplitView>
    )
}

export const SectionStack = Object.assign(SectionStackRoot, { Section })
