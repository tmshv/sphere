import type { CSSProperties, ReactNode } from "react"

const SWATCH_SIZE = 40
const SWATCH_GAP = 12
const SWATCH_BORDER = "1px solid rgba(128, 128, 128, 0.4)"

const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: SWATCH_GAP,
    padding: "4px 0",
}

const chipStyle: CSSProperties = {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    border: SWATCH_BORDER,
    borderRadius: 4,
    boxSizing: "border-box",
}

const nameStyle: CSSProperties = { width: 200, fontWeight: 600 }
const valueStyle: CSSProperties = { fontFamily: "monospace", fontSize: 11, opacity: 0.7 }

export type SwatchProps = {
    name: string
    light: string
    dark: string
}

// One semantic colour: both scheme values side by side, independent of the active theme.
export function Swatch({ name, light, dark }: SwatchProps) {
    return (
        <div style={rowStyle}>
            <div style={{ ...chipStyle, background: light }} title={light} />
            <div style={{ ...chipStyle, background: dark }} title={dark} />
            <div style={nameStyle}>{name}</div>
            <div style={valueStyle}>{light}</div>
            <div style={valueStyle}>{dark}</div>
        </div>
    )
}

export type SectionProps = {
    children: ReactNode
}

const sectionStyle: CSSProperties = { padding: 16 }

export function Section({ children }: SectionProps) {
    return <div style={sectionStyle}>{children}</div>
}
