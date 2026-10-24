import { semantic } from "./semantic"
import type { ColorScheme } from "./semantic"
import { duration, fontFamily, fontSize, lineHeight, radius, shadow, space, zIndex } from "./scales"

const PREFIX = "--sphere"
const PX = "px"
const MS = "ms"

function declare(name: string, value: string | number): string {
    return `${PREFIX}-${name}:${value}`
}

function group(name: string, values: Record<string, string | number>, unit = ""): string[] {
    return Object.entries(values).map(([key, value]) => declare(`${name}-${key}`, `${value}${unit}`))
}

function colors(scheme: ColorScheme): string[] {
    return Object.entries(semantic).map(([name, value]) => declare(`color-${name}`, value[scheme]))
}

function rule(selector: string, declarations: string[]): string {
    return `${selector}{${declarations.join(";")}}`
}

// Light values (and every non-colour scale) on :root, dark colours on
// :root[data-theme="dark"].
export function tokensToCss(): string {
    const light = [
        ...colors("light"),
        ...group("space", space, PX),
        ...group("radius", radius, PX),
        ...group("font-size", fontSize, PX),
        ...group("font-family", fontFamily),
        ...group("line-height", lineHeight),
        ...group("shadow", shadow),
        ...group("z-index", zIndex),
        ...group("duration", duration, MS),
    ]
    return `${rule(":root", light)}\n${rule(':root[data-theme="dark"]', colors("dark"))}`
}
