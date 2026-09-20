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
    value: string
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

export type SectionStackProps = {
    value: string[]
    onChange: (value: string[]) => void
    children: React.ReactNode
}

const SectionStackRoot: React.FC<SectionStackProps> = ({ value, onChange, children }) => {
    const { classes: s, cx } = useStyles()
    const baseId = useId()
    const handle = useRef<SplitViewHandle>(null)
    const sizes = useRef<number[]>([])
    const remembered = useRef(new Map<string, number>())
    const pending = useRef<string | null>(null)

    const sections = Children.toArray(children).filter(isSection)
    const openOf = (section: React.ReactElement<SectionProps>) => value.includes(section.props.value)
    const minSizeOf = (section: React.ReactElement<SectionProps>) => {
        if (!openOf(section)) {
            return SECTION_HEADER_HEIGHT
        }

        return SECTION_HEADER_HEIGHT + (section.props.minContentSize ?? DEFAULT_MIN_CONTENT_SIZE)
    }

    // sections and minSizeOf are rebuilt every render, so the effect below
    // cannot depend on them directly without re-running on every render. It
    // reads them from this ref, which is assigned on each render, and keys
    // off `value` instead — the only input that actually changes when a
    // section opens or closes.
    const latest = useRef({ sections, minSizeOf })
    latest.current = { sections, minSizeOf }

    const onSplitChange = useCallback((next: number[]) => {
        sizes.current = next
    }, [])

    // A reopened pane only grows to its minimum, so the size it had before it
    // was closed is reapplied once the new minimums have been laid out.
    useEffect(() => {
        const target = pending.current
        pending.current = null
        if (target === null || !value.includes(target)) {
            return
        }

        const { sections: currentSections, minSizeOf: currentMinSizeOf } = latest.current
        const height = remembered.current.get(target)
        const index = currentSections.findIndex(section => section.props.value === target)
        if (height === undefined || index < 0 || sizes.current.length < currentSections.length) {
            return
        }

        // allotment reports a size for every pane it has ever laid out,
        // including the trailing spacer, so sizes.current is one entry
        // longer than currentSections. minSizes must line up with
        // sizes.current by index, so the spacer's own zero minimum is
        // appended explicitly here rather than left to restoreSize's
        // internal `?? 0` default for a missing entry.
        const minSizes = [...currentSections.map(currentMinSizeOf), SPACER_MIN_SIZE]

        handle.current?.resize(restoreSize(sizes.current, index, height, minSizes))
    }, [value])

    const toggle = (section: React.ReactElement<SectionProps>) => {
        const id = section.props.value
        if (value.includes(id)) {
            const index = sections.indexOf(section)
            const height = sizes.current.at(index)
            if (height !== undefined) {
                remembered.current.set(id, height)
            }

            onChange(value.filter(open => open !== id))
            return
        }

        pending.current = id
        onChange([...value, id])
    }

    const allClosed = sections.every(section => !openOf(section))

    return (
        <SplitView vertical ref={handle} className={s.root} onChange={onSplitChange}>
            {sections.map(section => {
                const open = openOf(section)
                const bodyId = `${baseId}-${section.props.value}`

                return (
                    <SplitPane
                        key={section.props.value}
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
