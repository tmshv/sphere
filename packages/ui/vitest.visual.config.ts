import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"
import type { BrowserCommand } from "vitest/node"
import { OPTIMIZED_DEPS } from "./optimized-deps"

const VIEWPORT = { width: 800, height: 600 }

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
