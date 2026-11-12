import { useEffect, useRef, useState } from "react"

/** How long the result of a copy shows before the row's glyph goes back to Copy (ms). */
export const COPY_FEEDBACK_MS = 1500

export type CopyStatus = "copied" | "failed"

/** The row whose copy last finished, and how it went. */
export type CopyResult = { name: string; status: CopyStatus }

/** Copies text to the clipboard and remembers, for a while, which row it came from and whether it worked. */
export function useCopy() {
    const [result, setResult] = useState<CopyResult | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    useEffect(() => () => clearTimeout(timer.current), [])

    const show = (next: CopyResult) => {
        clearTimeout(timer.current)
        setResult(next)
        timer.current = setTimeout(() => setResult(null), COPY_FEEDBACK_MS)
    }

    // "Copied" shows only once the clipboard accepted the text; a refusal shows as "Copy failed".
    const copy = (name: string, text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => show({ name, status: "copied" }))
            .catch(() => show({ name, status: "failed" }))
    }

    return { result, copy }
}
