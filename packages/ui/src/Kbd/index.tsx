import type { ReactNode } from "react"
import s from "./kbd.module.css"

export type KbdProps = {
    /** The key: a symbol (⌘, ⇧, ↵) or a name (Esc, K). */
    children: ReactNode
}

/** One keyboard key, drawn as a key cap. */
export function Kbd({ children }: KbdProps) {
    return <kbd className={s.kbd}>{children}</kbd>
}

export type KbdShortcutProps = {
    /** The keys pressed together, in order: ["⌘", "⇧", "K"]. */
    keys: ReadonlyArray<string>
}

type KeyCap = { id: string; key: string }

// A shortcut may repeat a key ("G G"), so each cap is named by its key and which occurrence of it it is.
function keyCaps(keys: ReadonlyArray<string>): KeyCap[] {
    const seen = new Map<string, number>()
    return keys.map(key => {
        const occurrence = (seen.get(key) ?? 0) + 1
        seen.set(key, occurrence)
        return { id: `${key}#${occurrence}`, key }
    })
}

/** A keyboard shortcut: its keys as caps side by side, marked up as one key combination (nested kbd). */
export function KbdShortcut({ keys }: KbdShortcutProps) {
    if (keys.length === 0) {
        return null
    }

    return (
        <kbd className={s.shortcut}>
            {keyCaps(keys).map(cap => (
                <Kbd key={cap.id}>{cap.key}</Kbd>
            ))}
        </kbd>
    )
}
