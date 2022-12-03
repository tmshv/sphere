import { ThemeProvider } from "@/ui/ThemeProvider"
import { useAppSelector } from "@/store/hooks"
import { selectIsDark } from "@/store/app"

export type SphereThemeProviderProps = {
    children: React.ReactNode
}

export const SphereThemeProvider: React.FC<SphereThemeProviderProps> = ({ children }) => {
    const dark = useAppSelector(selectIsDark)

    return (
        <ThemeProvider dark={dark}>
            {children}
        </ThemeProvider>
    )
}
