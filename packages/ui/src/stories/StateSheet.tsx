import { type ReactNode, useEffect, useRef } from "react"
import { stateCaptionStyle, stateCellStyle, stateSheetStyle } from "./layout"
import {
    PINNED_STATES,
    pinnedStateCss,
    STORY_STATE_CAPTION,
    STORY_STATES,
    type StoryState,
    type StyleRuleText,
} from "./states"

const STYLE_ID = "story-pinned-states"

function styleRuleTexts(rules: CSSRuleList): StyleRuleText[] {
    return [...rules].flatMap(rule => {
        if (rule instanceof CSSStyleRule) {
            return [{ selectorText: rule.selectorText, declarations: rule.style.cssText }]
        }
        if (rule instanceof CSSGroupingRule) {
            return styleRuleTexts(rule.cssRules)
        }
        return []
    })
}

// The page's own stylesheets: a cross-origin sheet cannot be read, and the pinned sheet is not copied into itself.
function componentSheets(): CSSStyleSheet[] {
    return [...document.styleSheets]
        .filter(sheet => sheet.href === null || new URL(sheet.href).origin === window.location.origin)
        .filter(sheet => !(sheet.ownerNode instanceof Element && sheet.ownerNode.id === STYLE_ID))
}

// Writes the pinned copies of the state rules into one <style> at the end of <head>, after every component sheet,
// so a pinned rule wins the same ties its pseudo-class rule would.
function installPinnedStates() {
    const css = pinnedStateCss(componentSheets().flatMap(sheet => styleRuleTexts(sheet.cssRules)))
    const style = document.getElementById(STYLE_ID) ?? document.createElement("style")
    style.id = STYLE_ID
    style.textContent = css
    document.head.append(style)
}

type StateCellProps = {
    state: StoryState
    target: string
    children: ReactNode
}

function StateCell({ state, target, children }: StateCellProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const element = ref.current?.querySelector(target)
        if (state === "rest" || !element) {
            return
        }
        const { attribute } = PINNED_STATES[state]
        element.setAttribute(attribute, "")
        return () => element.removeAttribute(attribute)
    }, [state, target])

    return (
        <div ref={ref} style={stateCellStyle}>
            <span style={stateCaptionStyle}>{STORY_STATE_CAPTION[state]}</span>
            {children}
        </div>
    )
}

type StateSheetProps = {
    /** Renders the control; called once per state, so each state gets its own instance. */
    render: () => ReactNode
    /** The element inside the control that takes the press. */
    target: string
    /** Where keyboard focus lands, when it is not the pressed element (a radio group focuses its checked radio). */
    focusTarget?: string
}

/** Rest, keyboard focus and press side by side, drawn by the components' own state rules. */
export function StateSheet({ render, target, focusTarget = target }: StateSheetProps) {
    useEffect(installPinnedStates, [])

    return (
        <div style={stateSheetStyle}>
            {STORY_STATES.map(state => (
                <StateCell key={state} state={state} target={state === "focus" ? focusTarget : target}>
                    {render()}
                </StateCell>
            ))}
        </div>
    )
}
