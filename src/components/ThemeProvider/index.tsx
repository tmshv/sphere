import { MantineProvider } from "@mantine/core";
import { useAppSelector } from "@/store/hooks";
import { selectIsDark } from "@/store/app";

export type ThemeProviderProps = {
    children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const isDark = useAppSelector(selectIsDark)

    return (
        <MantineProvider withGlobalStyles withNormalizeCSS theme={{
            colorScheme: isDark ? "dark" : "light",
            spacing: {
                xs: 4,
                sm: 6,
                xl: 28, // height of Window Title
            },
            headings: {
                sizes: {
                    h3: {
                        fontSize: 18,
                    }
                },
            },
            activeStyles: {
                transform: "none",
            },
            primaryColor: 'blue',
        }}>
            {children}
        </MantineProvider>
    );
}
