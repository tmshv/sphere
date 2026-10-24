import { ThemeProvider } from "@sphere/ui"
import { type RenderOptions, render } from "@testing-library/react"
import type React from "react"

function AllProviders({ children }: { children: React.ReactNode }) {
    return <ThemeProvider dark={false}>{children}</ThemeProvider>
}

function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
    return render(ui, { wrapper: AllProviders, ...options })
}

export * from "@testing-library/react"
export { customRender as render }
