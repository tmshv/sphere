import "@/style.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"
import { ErrorBoundary } from "react-error-boundary"
import App from "@/components/App"
import { store } from "@/store"
import { SphereThemeProvider } from "@/components/SphereThemeProvider"
import { RootErrorFallback } from "@/ui/ErrorFallback/RootErrorFallback"
import { handleDragDrop, handleHotkey, handleTheme, handleVersion } from "@/tauri"
import { setupMaplibre } from "@/maplibre"

async function main() {
    setupMaplibre()
    await handleDragDrop()
    await handleTheme()
    handleVersion()
    handleHotkey()

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
        <React.StrictMode>
            <ErrorBoundary FallbackComponent={RootErrorFallback}>
                <Provider store={store}>
                    <SphereThemeProvider>
                        <App />
                    </SphereThemeProvider>
                </Provider>
            </ErrorBoundary>
        </React.StrictMode>,
    )
}

main()
