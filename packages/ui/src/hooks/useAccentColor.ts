import { semantic } from "../tokens"
import { useColorScheme } from "./useColorScheme"

export function useAccentColor(): string {
    return semantic["accent-icon"][useColorScheme()]
}
