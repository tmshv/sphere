import { legacySemantic } from "../tokens"
import { useColorScheme } from "./useColorScheme"

export function useAccentColor(): string {
    return legacySemantic["accent-icon"][useColorScheme()]
}
