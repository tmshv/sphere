import { createContext, useContext } from "react"
import type { ColorScheme } from "../tokens"

export const ColorSchemeContext = createContext<ColorScheme>("light")

export function useColorScheme(): ColorScheme {
    return useContext(ColorSchemeContext)
}
