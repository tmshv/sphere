import type { ColorScheme } from "./palette"
import {
    controlHeight,
    duration,
    fontFamily,
    fontSize,
    focusRingWidth,
    fontWeight,
    hairline,
    lineHeight,
    menuItemHeight,
    titlebarHeight,
    opacity,
    radius,
    rowHeight,
    shadow,
    space,
    zIndex,
} from "./scales"
import { semantic } from "./semantic"

const PREFIX = "--sphere"
const PX = "px"
const MS = "ms"
const UPPERCASE = /[A-Z]/g

type Declaration = [string, string]

// tooltipDelay -> tooltip-delay
function kebab(name: string): string {
    return name.replace(UPPERCASE, letter => `-${letter.toLowerCase()}`)
}

function group(name: string, values: Record<string, string | number>, unit = ""): Declaration[] {
    return Object.entries(values).map(([key, value]) => [`${name}-${kebab(key)}`, `${value}${unit}`])
}

function colors(scheme: ColorScheme): Declaration[] {
    return Object.entries(semantic).map(([name, value]) => [`color-${name}`, value[scheme]])
}

function scales(): Declaration[] {
    return [
        ...group("space", space, PX),
        ...group("radius", radius, PX),
        ...group("font-size", fontSize, PX),
        ...group("font-family", fontFamily),
        ...group("font-weight", fontWeight),
        ...group("line-height", lineHeight),
        ...group("control-height", controlHeight, PX),
        ["row-height", `${rowHeight}${PX}`],
        ["menu-item-height", `${menuItemHeight}${PX}`],
        ["titlebar-height", `${titlebarHeight}${PX}`],
        ["hairline", `${hairline}${PX}`],
        ["focus-ring-width", `${focusRingWidth}${PX}`],
        ...group("shadow", shadow),
        ...group("duration", duration, MS),
        ...group("opacity", opacity),
        ...group("z-index", zIndex),
    ]
}

function rule(selector: string, declarations: Declaration[]): string {
    const body = declarations.map(([name, value]) => `${PREFIX}-${name}:${value}`).join(";")
    return `${selector}{${body}}`
}

// Light colours and every non-colour scale on :root, dark colours on :root[data-theme="dark"].
export function tokensToCss(): string {
    return `${rule(":root", [...colors("light"), ...scales()])}\n${rule(':root[data-theme="dark"]', colors("dark"))}`
}
