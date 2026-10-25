import { useEffect, useRef } from "react"
import { matchesHotkey, parseHotkey } from "./parseHotkey"

export type HotkeyBinding = [string, (event: KeyboardEvent) => void]

// Mantine 5.10 default: keystrokes typed into these elements are never hotkeys.
const IGNORED_TAGS: ReadonlyArray<string> = ["INPUT", "TEXTAREA", "SELECT"]

// Mantine's Select and SegmentedControl were inputs, so keystrokes in them were ignored too. Their Base UI
// replacements are a button (role=combobox) and a span (role=radio); the same keystrokes stay ignored.
const IGNORED_ROLE_SELECTOR = "[role=combobox], [role=radio]"

function shouldFire(event: KeyboardEvent): boolean {
    const { target } = event
    if (target instanceof HTMLElement) {
        return (
            !target.isContentEditable &&
            !IGNORED_TAGS.includes(target.tagName) &&
            target.closest(IGNORED_ROLE_SELECTOR) === null
        )
    }
    return true
}

export function useHotkeys(bindings: ReadonlyArray<HotkeyBinding>): void {
    const latest = useRef(bindings)
    latest.current = bindings

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            for (const [hotkey, handler] of latest.current) {
                if (matchesHotkey(parseHotkey(hotkey), event) && shouldFire(event)) {
                    event.preventDefault()
                    handler(event)
                }
            }
        }
        // The root element, as Mantine does, so handlers on body or inside see the event first.
        document.documentElement.addEventListener("keydown", onKeyDown)
        return () => document.documentElement.removeEventListener("keydown", onKeyDown)
    }, [])
}
