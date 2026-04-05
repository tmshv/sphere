import { DEFAULT_MAP_TOOL } from "@/lib/map-tools"
import type { store } from "."
import { actions } from "./actions"

export function setupKeyboard(s: typeof store) {
    window.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            const { mapTool } = s.getState().app
            if (mapTool !== DEFAULT_MAP_TOOL) {
                s.dispatch(actions.app.setMapTool(DEFAULT_MAP_TOOL))
            }
        }
    })
}
