import { MantineProvider } from "@mantine/core"
import { useInsertionEffect, useLayoutEffect } from "react"
import { ColorSchemeContext } from "../hooks/useColorScheme"
import { tokensToCss } from "../tokens"
import "./global.css"

const TOKENS_STYLE_ID = "sphere-tokens"

export type ThemeProviderProps = {
    dark: boolean
    children: React.ReactNode
}

// One <style> per document, however many providers mount.
function ensureTokensStyle() {
    if (document.getElementById(TOKENS_STYLE_ID)) {
        return
    }
    const style = document.createElement("style")
    style.id = TOKENS_STYLE_ID
    style.textContent = tokensToCss()
    document.head.appendChild(style)
}

export function ThemeProvider({ children, dark }: ThemeProviderProps) {
    const scheme = dark ? "dark" : "light"

    useInsertionEffect(ensureTokensStyle, [])

    useLayoutEffect(() => {
        const root = document.documentElement
        root.dataset.theme = scheme
        root.style.colorScheme = scheme
    }, [scheme])

    return (
        <ColorSchemeContext.Provider value={scheme}>
            <MantineProvider
                theme={{
                    colorScheme: scheme,
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
        </ColorSchemeContext.Provider>
    )
}
