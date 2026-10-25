export type Hotkey = {
    key: string | undefined
    mod: boolean
    shift: boolean
    alt: boolean
}

const SEPARATOR = "+"
const MOD = "mod"
const SHIFT = "shift"
const ALT = "alt"
const MODIFIERS: ReadonlyArray<string> = [MOD, SHIFT, ALT]
const KEY_CODE_PREFIX = "Key"

// "mod+V" or "mod + p": spaces ignored, case ignored. `mod` is Ctrl or Cmd, whichever is pressed.
export function parseHotkey(hotkey: string): Hotkey {
    const parts = hotkey
        .toLowerCase()
        .split(SEPARATOR)
        .map(part => part.trim())
    return {
        key: parts.find(part => !MODIFIERS.includes(part)),
        mod: parts.includes(MOD),
        shift: parts.includes(SHIFT),
        alt: parts.includes(ALT),
    }
}

// Mantine 5 isExactHotkey: modifiers must match exactly, except that `mod` accepts either
// Ctrl or Cmd. A hotkey without `mod` fires only while neither is held. The key matches by
// the typed character or by the physical key code ("KeyV" is "v").
export function matchesHotkey(hotkey: Hotkey, event: KeyboardEvent): boolean {
    if (hotkey.alt !== event.altKey || hotkey.shift !== event.shiftKey) {
        return false
    }
    if (hotkey.mod ? !event.ctrlKey && !event.metaKey : event.ctrlKey || event.metaKey) {
        return false
    }
    if (hotkey.key === undefined) {
        return false
    }
    return (
        event.key.toLowerCase() === hotkey.key || event.code.replace(KEY_CODE_PREFIX, "").toLowerCase() === hotkey.key
    )
}
