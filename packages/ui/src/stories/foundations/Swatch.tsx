import type { CSSProperties } from "react"
import {
    DIMMED_OPACITY,
    HAIRLINE,
    NAME_WEIGHT,
    NAME_WIDTH,
    rowStyle,
    SWATCH_RADIUS,
    SWATCH_SIZE,
    VALUE_FONT_SIZE,
} from "./styles"

const chipStyle: CSSProperties = {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    border: HAIRLINE,
    borderRadius: SWATCH_RADIUS,
    boxSizing: "border-box",
}

const nameStyle: CSSProperties = { width: NAME_WIDTH, fontWeight: NAME_WEIGHT }
const valueStyle: CSSProperties = { fontFamily: "monospace", fontSize: VALUE_FONT_SIZE, opacity: DIMMED_OPACITY }

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
