import type { DrawActionableState } from "../types"
import type Evented from "./evented"

/** What Draw reports before its first `draw.actionable`: nothing is actionable. */
const INITIAL_STATE: DrawActionableState = {
    trash: false,
    combineFeatures: false,
    uncombineFeatures: false,
}

function isActionableState(value: unknown): value is DrawActionableState {
    return (
        typeof value === "object" &&
        value !== null &&
        "trash" in value &&
        "combineFeatures" in value &&
        "uncombineFeatures" in value
    )
}

function actionsOf(data: unknown): DrawActionableState {
    if (typeof data !== "object" || data === null || !("actions" in data) || !isActionableState(data.actions)) {
        throw new Error("draw.actionable data has an unexpected shape")
    }
    return data.actions
}

/**
 * Returns a function giving the actionable state Draw last reported. `draw.actionable` fires only on
 * change, so this is Draw's current state as long as tracking starts before the control is added.
 */
export default function trackActionable(map: Evented): () => DrawActionableState {
    let state = INITIAL_STATE
    map.on("draw.actionable", data => {
        // Draw hands out its own state object and mutates it later, so keep a copy
        state = { ...actionsOf(data) }
    })
    return () => state
}
