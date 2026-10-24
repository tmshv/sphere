import { MantineProvider } from "@mantine/core"

export type ThemeProviderProps = {
    dark: boolean
    children: React.ReactNode
}

export function ThemeProvider({ children, dark }: ThemeProviderProps) {
    return (
        <MantineProvider
            withGlobalStyles
            withNormalizeCSS
            theme={{
                colorScheme: dark ? "dark" : "light",
                spacing: {
                    xs: 4,
                    // sm: 6,
                    xl: 28, // height of Window Title
                },
                headings: {
                    sizes: {
                        h3: {
                            fontSize: 18,
                        },
                    },
                },
                activeStyles: {
                    transform: "none",
                },
                primaryColor: "blue",
            }}
        >
            {children}
        </MantineProvider>
    )
}
