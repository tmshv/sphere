import { replaceState } from "../selector-list"

// The states a States sheet lays side by side.
export type StoryState = "rest" | "focus" | "pressed"
export type PinnedState = Exclude<StoryState, "rest">

export const STORY_STATES: ReadonlyArray<StoryState> = ["rest", "focus", "pressed"]

export const STORY_STATE_CAPTION: Record<StoryState, string> = {
    rest: "Rest",
    focus: "Keyboard focus",
    pressed: "Pressed",
}

// A browser shows a press only while the mouse button is held and keyboard focus on one control at a time, so a
// sheet pins each state with an attribute on the control instead of the pseudo-class.
export const PINNED_STATES: Record<PinnedState, { pseudoClass: string; attribute: string }> = {
    focus: { pseudoClass: ":focus-visible", attribute: "data-story-focus-visible" },
    pressed: { pseudoClass: ":active", attribute: "data-story-active" },
}

export type StyleRuleText = { selectorText: string; declarations: string }

// The components' own state rules, copied with each pinned pseudo-class swapped for its attribute, so a sheet shows
// exactly what the stylesheet draws in that state and cannot drift from it.
export function pinnedStateCss(rules: ReadonlyArray<StyleRuleText>): string {
    return Object.values(PINNED_STATES)
        .flatMap(({ pseudoClass, attribute }) =>
            rules.flatMap(rule => {
                const selectors = replaceState(rule.selectorText, pseudoClass, `[${attribute}]`)
                return selectors.length > 0 ? [`${selectors.join(", ")} { ${rule.declarations} }`] : []
            }),
        )
        .join("\n")
}
