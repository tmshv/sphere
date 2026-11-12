// Raw colours of the desktop design system. Components never read this directly; they go through the semantic
// colours in semantic.ts.

export type ColorScheme = "light" | "dark"

// One colour with a value per scheme.
export type SchemeColor = Record<ColorScheme, string>

// A 13-step neutral ramp from white (0) to black (12), shared by both themes. The light theme is tuned to OS X
// El Capitan (window 2 = #ececec, content 0 = white), the dark theme to later macOS dark mode (window 9 = #323232,
// content 11 = #1e1e1e).
type Ramp = readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
]

export type SystemHue = "blue" | "red" | "orange" | "yellow" | "green"

type Palette = { gray: Ramp } & Record<SystemHue, SchemeColor>

export const palette: Palette = {
    gray: [
        "#ffffff",
        "#f5f5f5",
        "#ececec",
        "#dedede",
        "#c8c8c8",
        "#a8a8a8",
        "#808080",
        "#646464",
        "#4a4a4a",
        "#323232",
        "#282828",
        "#1e1e1e",
        "#000000",
    ],
    // System blue, darker than El Capitan's #1a82fb (and macOS dark #0a84ff) so white text on it meets WCAG AA.
    blue: { light: "#0a6cf0", dark: "#1d6ff2" },
    // The accessible variants of the macOS system colours: readable as text on window in their scheme.
    red: { light: "#d70015", dark: "#ff6961" },
    orange: { light: "#c93400", dark: "#ffb340" },
    yellow: { light: "#b25000", dark: "#ffd426" },
    green: { light: "#248a3d", dark: "#30db5b" },
}
