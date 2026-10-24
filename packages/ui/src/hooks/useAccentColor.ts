import { useMantineTheme } from "@mantine/core"

const LIGHT_SHADE = 7
const DARK_SHADE = 5

export function useAccentColor(): string {
    const theme = useMantineTheme()
    const shade = theme.colorScheme === "dark" ? DARK_SHADE : LIGHT_SHADE
    return theme.colors.blue[shade]
}
