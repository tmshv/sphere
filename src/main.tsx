import "@/style.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"
import { App } from "@/components/App"
import { store } from "@/store"
import { SphereThemeProvider } from "@/components/SphereThemeProvider"
import { handleDragDrop, handleHotkey, handleTheme, handleVersion } from "@/tauri"
import { setupMaplibre } from "@/maplibre"

function main() {
    setupMaplibre()
    handleDragDrop()
    handleTheme()
    handleVersion()
    handleHotkey()

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
        <React.StrictMode>
            <Provider store={store}>
                <SphereThemeProvider>
                    <App />
                </SphereThemeProvider>
            </Provider>
        </React.StrictMode>,
    )
}

main()
