// Raw colours copied verbatim from the Mantine 5.10.5 default colours. Components never read this
// directly; they go through the semantic colours.

type Shades = readonly [string, string, string, string, string, string, string, string, string, string]

export type Hue = "dark" | "gray" | "red" | "yellow" | "orange" | "blue"

type Palette = Record<Hue, Shades> & { white: string; black: string }

export const palette: Palette = {
    white: "#fff",
    black: "#000",
    dark: [
        "#C1C2C5",
        "#A6A7AB",
        "#909296",
        "#5c5f66",
        "#373A40",
        "#2C2E33",
        "#25262b",
        "#1A1B1E",
        "#141517",
        "#101113",
    ],
    gray: [
        "#f8f9fa",
        "#f1f3f5",
        "#e9ecef",
        "#dee2e6",
        "#ced4da",
        "#adb5bd",
        "#868e96",
        "#495057",
        "#343a40",
        "#212529",
    ],
    red: ["#fff5f5", "#ffe3e3", "#ffc9c9", "#ffa8a8", "#ff8787", "#ff6b6b", "#fa5252", "#f03e3e", "#e03131", "#c92a2a"],
    yellow: [
        "#fff9db",
        "#fff3bf",
        "#ffec99",
        "#ffe066",
        "#ffd43b",
        "#fcc419",
        "#fab005",
        "#f59f00",
        "#f08c00",
        "#e67700",
    ],
    orange: [
        "#fff4e6",
        "#ffe8cc",
        "#ffd8a8",
        "#ffc078",
        "#ffa94d",
        "#ff922b",
        "#fd7e14",
        "#f76707",
        "#e8590c",
        "#d9480f",
    ],
    blue: [
        "#e7f5ff",
        "#d0ebff",
        "#a5d8ff",
        "#74c0fc",
        "#4dabf7",
        "#339af0",
        "#228be6",
        "#1c7ed6",
        "#1971c2",
        "#1864ab",
    ],
}
