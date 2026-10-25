import { IconCheck, IconCopy } from "@tabler/icons"
import { useState } from "react"
import iconButton from "../Button/icon-button.module.css"
import { Tooltip, unstyledButton } from "../internal"
import s from "./properties-viewer.module.css"

const ICON_SIZE = 12
const COPIED_MS = 1500

type CopyButtonProps = {
    value: string
}

export function CopyButton({ value }: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), COPIED_MS)
    }

    const label = copied ? "Copied!" : "Copy"
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
