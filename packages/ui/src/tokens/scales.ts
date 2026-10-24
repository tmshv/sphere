// Values match what renders today: Mantine 5 defaults plus Sphere's
// ThemeProvider overrides (spacing.xs = 4, spacing.xl = 28).

export const space = { xxs: 2, xs: 4, sm: 12, md: 16, lg: 20, xl: 28 } as const

export const radius = { xs: 2, sm: 4, md: 8, lg: 16, xl: 32 } as const

export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 } as const

export const fontFamily = {
    sans: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
} as const

export const lineHeight = { body: 1.55 } as const

export const shadow = {
    xs: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 10px 15px -5px, rgba(0, 0, 0, 0.04) 0px 7px 7px -5px",
    md: "0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 20px 25px -5px, rgba(0, 0, 0, 0.04) 0px 10px 10px -5px",
    lg: "0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 28px 23px -7px, rgba(0, 0, 0, 0.04) 0px 12px 12px -7px",
    xl: "0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 36px 28px -7px, rgba(0, 0, 0, 0.04) 0px 17px 17px -7px",
} as const

// Mantine 5 layering: app 100, modal 200, popover 300, overlay 400, max 9999.
export const zIndex = { app: 100, modal: 200, popover: 300, overlay: 400, max: 9999 } as const

// Milliseconds. Mantine 5 transitions run 100ms (controls) and 200ms (popups).
export const duration = { fast: 100, normal: 200 } as const
