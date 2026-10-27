import "vitest/browser"

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Presses the primary mouse button where the pointer is; see vitest.visual.config.ts. */
        mouseDown: () => Promise<void>
        mouseUp: () => Promise<void>
    }
}
