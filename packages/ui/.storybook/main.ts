import type { StorybookConfig } from "@storybook/react-vite"
import { OPTIMIZED_DEPS } from "../optimized-deps.ts"

const config: StorybookConfig = {
    framework: "@storybook/react-vite",
    addons: ["@storybook/addon-docs"],
    stories: ["../src/**/*.mdx", "../src/**/*.stories.tsx"],
    viteFinal: viteConfig => ({
        ...viteConfig,
        optimizeDeps: {
            ...viteConfig.optimizeDeps,
            include: [...(viteConfig.optimizeDeps?.include ?? []), ...OPTIMIZED_DEPS],
        },
    }),
}

export default config
