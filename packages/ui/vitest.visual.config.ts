import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

const VIEWPORT = { width: 800, height: 600 }

// Pre-bundle up front: a mid-run re-optimisation reloads the page and breaks hooks.
const OPTIMIZED_DEPS = [
    "react",
    "react-dom",
    "react-dom/client",
    "@base-ui/react/button",
    "@base-ui/react/dialog",
    "@base-ui/react/combobox",
    "@base-ui/react/select",
    "@base-ui/react/radio",
    "@base-ui/react/radio-group",
    "@base-ui/react/field",
    "@base-ui/react/tabs",
    "@base-ui/react/tooltip",
    "@mantine/core",
    "@mantine/hooks",
    "@mantine/spotlight",
    "@emotion/react",
    "@tabler/icons",
    "allotment",
    "@tanstack/react-table",
    "react-dnd",
    "react-dnd-html5-backend",
    "@visx/group",
    "@visx/scale",
    "@visx/shape",
    "date-fns",
]

export default defineConfig({
    plugins: [react()],
    optimizeDeps: { include: OPTIMIZED_DEPS },
    test: {
        include: ["src/**/*.visual.test.tsx"],
        globals: true,
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "webkit", viewport: VIEWPORT }],
        },
    },
})
