import { IconCheck, IconCopy } from "@sphere/icons"
import { useEffect, useRef, useState } from "react"
import iconButton from "../Button/icon-button.module.css"
import { Tooltip, unstyledButton } from "../internal"
import s from "./properties-viewer.module.css"

const ICON_SIZE = 12
const FEEDBACK_MS = 1500

type CopyStatus = "idle" | "copied" | "failed"

const LABEL: Record<CopyStatus, string> = {
    idle: "Copy",
    copied: "Copied!",
    failed: "Copy failed",
}

type CopyButtonProps = {
    value: string
}

export function CopyButton({ value }: CopyButtonProps) {
    const [status, setStatus] = useState<CopyStatus>("idle")
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    useEffect(() => () => clearTimeout(timer.current), [])

    const show = (next: CopyStatus) => {
        clearTimeout(timer.current)
        setStatus(next)
        timer.current = setTimeout(() => setStatus("idle"), FEEDBACK_MS)
    }

    // "Copied" appears only once the clipboard accepted the text; a refusal shows in the tooltip.
    const handleCopy = () => {
        navigator.clipboard
            .writeText(value)
            .then(() => show("copied"))
            .catch(() => show("failed"))
    }

    const copied = status === "copied"
    const label = LABEL[status]
    const classes = [
        unstyledButton,
        iconButton.iconButton,
        iconButton.sizeSm,
        iconButton.subtle,
        copied ? s.copied : s.copy,
    ]

    return (
        <Tooltip label={label} arrow>
            <button type="button" aria-label={label} className={classes.join(" ")} onClick={handleCopy}>
                {copied ? <IconCheck size={ICON_SIZE} /> : <IconCopy size={ICON_SIZE} />}
            </button>
        </Tooltip>
    )
}
