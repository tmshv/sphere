import { semantic } from "../tokens"
import { useColorScheme } from "./useColorScheme"

// The accent for a glyph drawn with an explicit colour (a source-kind icon in an outline), resolved for the
// provider's scheme. It is the glyph accent, not the fill accent, so it keeps 3:1 on the dark sidebar.
export function useAccentColor(): string {
    return semantic["accent-glyph"][useColorScheme()]
}
