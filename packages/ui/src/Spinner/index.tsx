import { Loader } from "@mantine/core"
import type { CSSProperties } from "react"

const DEFAULT_LABEL = "Loading"

const WRAPPER_STYLE: CSSProperties = { display: "inline-flex" }

export type SpinnerProps = {
    label?: string
}

export function Spinner({ label = DEFAULT_LABEL }: SpinnerProps) {
    return (
        <span role={"status"} aria-label={label} style={WRAPPER_STYLE}>
            <Loader size={"xs"} />
        </span>
    )
}
