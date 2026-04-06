import { DEFAULT_MAP_TOOL } from "@/lib/map-tools"
import type { store } from "."
import { copySelectionAsGeojson } from "@/lib/copy-selection"
import { actions } from "./actions"
import { selectors } from "./selectors"

function isEditableElement(el: Element | null): boolean {
    if (!el) return false
    const tag = el.tagName
    if (tag === "INPUT" || tag === "TEXTAREA") return true
    if (el instanceof HTMLElement && el.isContentEditable) return true
    return false
}

export function setupKeyboard(s: typeof store) {
    window.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            const { mapTool } = s.getState().app
            if (mapTool !== DEFAULT_MAP_TOOL) {
                s.dispatch(actions.app.setMapTool(DEFAULT_MAP_TOOL))
            }
        }

        if (e.key === "c" && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
            if (isEditableElement(document.activeElement)) return

            const state = s.getState()
            const sourceId = selectors.selection.sourceId(state)
            const count = selectors.selection.count(state)
            if (!sourceId || count === 0) return

            const wrapFc = selectors.settings.selectCopyWrapAsFeatureCollection(state)
            e.preventDefault()
            copySelectionAsGeojson(sourceId, wrapFc)
        }
    })
}
