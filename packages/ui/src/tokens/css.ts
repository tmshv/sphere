import { legacyScales, legacySemantic } from "./legacy"
import type { ColorScheme } from "./palette"
import {
    controlHeight,
    duration,
    fontFamily,
    fontSize,
    fontWeight,
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
import { semantic, type SemanticValue } from "./semantic"

const PREFIX = "--sphere"
const PX = "px"
const MS = "ms"
const UPPERCASE = /[A-Z]/g

type Declarations = Map<string, string>

// tooltipDelay -> tooltip-delay
function kebab(name: string): string {
    return name.replace(UPPERCASE, letter => `-${letter.toLowerCase()}`)
}

function group(name: string, values: Record<string, string | number>, unit = ""): [string, string][] {
    return Object.entries(values).map(([key, value]) => [`${name}-${kebab(key)}`, `${value}${unit}`])
}

function colors(set: Record<string, SemanticValue>, scheme: ColorScheme): [string, string][] {
    return Object.entries(set).map(([name, value]) => [`color-${name}`, value[scheme]])
}

function legacy(): [string, string][] {
    return [
        ...group("space", legacyScales.space, PX),
        ...group("radius", legacyScales.radius, PX),
        ...group("font-size", legacyScales.fontSize, PX),
        ...group("font-weight", legacyScales.fontWeight),
        ...group("line-height", legacyScales.lineHeight),
        ...group("shadow", legacyScales.shadow),
        ...group("duration", legacyScales.duration, MS),
    ]
}

function scales(): [string, string][] {
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
        ...group("shadow", shadow),
        ...group("duration", duration, MS),
        ...group("opacity", opacity),
        ...group("z-index", zIndex),
    ]
}

// Later entries replace earlier ones of the same name, so the new set wins over legacy on a clash.
function merge(...sets: [string, string][][]): Declarations {
    return new Map(sets.flat())
}

function rule(selector: string, declarations: Declarations): string {
    const body = Array.from(declarations, ([name, value]) => `${PREFIX}-${name}:${value}`).join(";")
    return `${selector}{${body}}`
}

// Light colours and every non-colour scale on :root, dark colours on :root[data-theme="dark"]. Legacy tokens are
// emitted too until every component has moved onto the new set.
export function tokensToCss(): string {
    const light = merge(colors(legacySemantic, "light"), colors(semantic, "light"), legacy(), scales())
    const dark = merge(colors(legacySemantic, "dark"), colors(semantic, "dark"))
    return `${rule(":root", light)}\n${rule(':root[data-theme="dark"]', dark)}`
}
