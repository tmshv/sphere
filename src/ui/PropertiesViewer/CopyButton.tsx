import { ActionIcon, createStyles, Tooltip } from "@mantine/core"
import { IconCheck, IconCopy } from "@tabler/icons"
import { useState } from "react"

const useStyles = createStyles({
    btn: {
        opacity: 0,
        "&:hover": {
            opacity: 1,
        },
    },
    copied: {
        opacity: 1,
    },
})

type CopyButtonProps = {
    value: string
}

export const CopyButton: React.FC<CopyButtonProps> = ({ value }) => {
    const { classes: s } = useStyles()
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <Tooltip label={copied ? "Copied!" : "Copy"} withArrow>
            <ActionIcon className={copied ? s.copied : s.btn} size="xs" onClick={handleCopy}>
                {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            </ActionIcon>
        </Tooltip>
    )
}
