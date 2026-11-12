import type { Preview } from "@storybook/react-vite"
import { ThemeProvider } from "../src/ThemeProvider"

const preview: Preview = {
    globalTypes: {
        theme: {
            description: "Colour theme",
            toolbar: {
                title: "Theme",
                icon: "circlehollow",
                items: [
                    { value: "light", title: "Light" },
                    { value: "dark", title: "Dark" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        theme: "light",
    },
    decorators: [
        (Story, context) => (
            <ThemeProvider dark={context.globals.theme === "dark"}>
                <Story />
            </ThemeProvider>
        ),
    ],
    parameters: {
        layout: "centered",
        backgrounds: { disable: true },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
}

export default preview
