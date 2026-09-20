import type { SectionLayout } from "."

// The spacer pane's own minimum/default size. It exists only to absorb
// leftover height when every section is pinned to its header, so it never
// needs to be more than zero.
export const SPACER_MIN_SIZE = 0

function isNumber(value: number | null): value is number {
    return value !== null
}

// One entry per child, in child order. A child with no row gets
// { name, open: true, size: null } — a section SectionStack has never been
// told about before defaults to open, with no stored height.
export function resolveSections(rows: SectionLayout[], childNames: string[]): SectionLayout[] {
    return childNames.map(name => {
        const row = rows.find(candidate => candidate.name === name)
        if (row !== undefined) {
            return row
        }

        return { name, open: true, size: null }
    })
}

// Apply resolved entries back onto the stored rows by name. Rows whose name
// matches no resolved entry are preserved unchanged and keep their
// position — this is what stops a transient render (a child temporarily
// absent) from destroying stored state for that section. A resolved entry
// with no matching row (a section SectionStack has never stored before) is
// appended, in resolved order.
export function mergeSections(rows: SectionLayout[], resolved: SectionLayout[]): SectionLayout[] {
    const updates = new Map(resolved.map(section => [section.name, section]))
    const rowNames = new Set(rows.map(row => row.name))

    const merged = rows.map(row => updates.get(row.name) ?? row)
    const additions = resolved.filter(section => !rowNames.has(section.name))

    return [...merged, ...additions]
}

// True only when every section is closed — including vacuously, when there
// are no sections at all.
export function isSpacerVisible(resolved: SectionLayout[]): boolean {
    return resolved.every(section => !section.open)
}

// Pane sizes in child order — open ? size : headerHeight — plus the
// trailing spacer entry. Returns undefined when any OPEN row has a null
// size, meaning "no stored layout, let allotment decide" rather than pin
// every open pane to a false height.
export function defaultSizesOf(resolved: SectionLayout[], headerHeight: number): number[] | undefined {
    const sizes = resolved.map(section => (section.open ? section.size : headerHeight))
    if (!sizes.every(isNumber)) {
        return undefined
    }

    return [...sizes, SPACER_MIN_SIZE]
}
