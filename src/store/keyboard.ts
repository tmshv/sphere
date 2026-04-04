import type { store } from "."
import { actions } from "./actions"

export function setupKeyboard(s: typeof store) {
    window.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            const { mapTool } = s.getState().app
            if (mapTool !== "pan") {
                s.dispatch(actions.app.setMapTool("pan"))
            }
        }
    })
}
