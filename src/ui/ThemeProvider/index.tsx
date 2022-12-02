import { MantineProvider } from "@mantine/core";

export type ThemeProviderProps = {
    dark: boolean
    children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, dark }) => (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={{
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
