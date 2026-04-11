import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { ThemeProvider } from "@sphere/ui"

export type SphereThemeProviderProps = {
    children: React.ReactNode
}

export const SphereThemeProvider: React.FC<SphereThemeProviderProps> = ({ children }) => {
    const dark = useAppSelector(selectors.app.isDark)

    return <ThemeProvider dark={dark}>{children}</ThemeProvider>
}
