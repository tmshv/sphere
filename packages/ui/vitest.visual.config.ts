import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"
import type { BrowserCommand } from "vitest/node"

const VIEWPORT = { width: 800, height: 600 }

// Pre-bundle up front: a mid-run re-optimisation reloads the page and breaks hooks.
const OPTIMIZED_DEPS = [
    "react",
    "react-dom",
    "react-dom/client",
    "@base-ui/react/button",
    "@base-ui/react/dialog",
    "@base-ui/react/autocomplete",
    "@base-ui/react/combobox",
    "@base-ui/react/menu",
    "@base-ui/react/select",
    "@base-ui/react/radio",
    "@base-ui/react/radio-group",
    "@base-ui/react/field",
    "@base-ui/react/tabs",
    "@base-ui/react/tooltip",
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

// Holds the primary mouse button down at the pointer's current position (a prior hover puts it on the target),
// so a test can observe the :active state. The test releases it afterwards.
const mouseDown: BrowserCommand<[]> = async ({ page }) => {
    await page.mouse.down()
}

const mouseUp: BrowserCommand<[]> = async ({ page }) => {
    await page.mouse.up()
}

export default defineConfig({
    plugins: [react()],
    optimizeDeps: { include: OPTIMIZED_DEPS },
    test: {
        include: ["src/**/*.visual.test.tsx"],
        globals: true,
        browser: {
            enabled: true,
            headless: true,
            commands: { mouseDown, mouseUp },
            provider: playwright(),
            instances: [{ browser: "webkit", viewport: VIEWPORT }],
        },
    },
})
