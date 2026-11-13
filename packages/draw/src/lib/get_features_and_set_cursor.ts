import featuresAt, { type FeaturesAtContext } from "./features_at"
import * as Constants from "../constants"
import type { DrawFeatureTarget, MapClasses, ScreenPoint } from "../types"

const DRAW_MODE_MARKER = "draw"

/** What the cursor update needs from the Draw context. */
export interface CursorContext extends FeaturesAtContext {
    readonly events: { currentModeName(): string | null }
    readonly ui: {
        queueMapClasses(classes: MapClasses): void
        updateMapClasses(): void
    }
}

export default function getFeatureAtAndSetCursors(
    event: { point: ScreenPoint },
    ctx: CursorContext,
): DrawFeatureTarget | undefined {
    const features = featuresAt.click(event, null, ctx)
    const classes: MapClasses = { mouse: Constants.cursors.NONE }

    const feature = features.at(0)
    if (feature) {
        classes.mouse =
            feature.properties.active === Constants.activeStates.ACTIVE
                ? Constants.cursors.MOVE
                : Constants.cursors.POINTER
        classes.feature = feature.properties.meta
    }

    const modeName = ctx.events.currentModeName()
    if (modeName === null) throw new TypeError("Draw has no current mode")
    if (modeName.indexOf(DRAW_MODE_MARKER) !== -1) {
        classes.mouse = Constants.cursors.ADD
    }

    ctx.ui.queueMapClasses(classes)
    ctx.ui.updateMapClasses()

    return feature
}
