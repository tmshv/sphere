import type { CSSProperties, ReactNode } from "react"
import { PAGE_PADDING } from "./styles"

const sectionStyle: CSSProperties = { padding: PAGE_PADDING }

export type SectionProps = {
    children: ReactNode
}

export function Section({ children }: SectionProps) {
    return <div style={sectionStyle}>{children}</div>
}
