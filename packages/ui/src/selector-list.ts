// Selector-list helpers shared by the CSS test helpers (test-utils) and the Storybook States sheets. Not exported
// from the package.

// Splits a selector list on its top-level commas, leaving commas inside `:is(…)`, `:not(…)` and attribute brackets.
export function splitSelectorList(selectorText: string): string[] {
    const parts: string[] = []
    let depth = 0
    let start = 0
    for (const [index, char] of [...selectorText].entries()) {
        if (char === "(" || char === "[") {
            depth += 1
        } else if (char === ")" || char === "]") {
            depth -= 1
        } else if (char === "," && depth === 0) {
            parts.push(selectorText.slice(start, index))
            start = index + 1
        }
    }
    parts.push(selectorText.slice(start))
    return parts.map(part => part.trim())
}

// The selectors of a rule that style a state (a pseudo-class such as `:active`, or a state attribute), with the
// state replaced. `:focus:not(:focus-visible)` styles the absence of the state, so it is skipped; the check is per
// selector, so a mixed comma list cannot hide a real state rule.
export function replaceState(selectorText: string, state: string, replacement: string): string[] {
    return splitSelectorList(selectorText)
        .filter(selector => selector.includes(state))
        .filter(selector => !selector.includes(`:not(${state})`))
        .map(selector => selector.replaceAll(state, replacement))
}
