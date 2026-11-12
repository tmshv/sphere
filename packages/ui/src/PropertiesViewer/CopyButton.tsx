import { IconCheck, IconCopy } from "@sphere/icons"
import { useEffect, useRef, useState } from "react"
import { IconButton } from "../Button"
import { Tooltip } from "../internal"
import s from "./properties-viewer.module.css"

const ICON_SIZE = 14
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

    // The wrapper is the tooltip trigger and carries the reveal: it shows on row hover or keyboard focus, and
    // stays lit while "Copied" shows. The button itself has no hover style.
    return (
        <Tooltip label={label}>
            <span className={copied ? s.copied : s.copy}>
                <IconButton
                    size="sm"
                    icon={copied ? <IconCheck size={ICON_SIZE} /> : <IconCopy size={ICON_SIZE} />}
                    label={label}
                    nativeTooltip={false}
                    onClick={handleCopy}
                />
            </span>
        </Tooltip>
    )
}
