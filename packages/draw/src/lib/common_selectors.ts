import * as Constants from "../constants"
import type { DrawFeatureTarget } from "../types"

const KEY_CODE_ENTER = 13
const KEY_CODE_ESCAPE = 27
const MAIN_MOUSE_BUTTON = 0

/** An event that may carry the Draw feature under the pointer. */
interface TargetEvent {
    featureTarget?: DrawFeatureTarget
}

/** An event that may carry the DOM event behind it. */
interface OriginalEventHolder {
    originalEvent?: {
        shiftKey?: boolean
        button?: number
    }
}

export function isOfMetaType(type: string): (e: TargetEvent) => boolean {
    return e => {
        const featureTarget = e.featureTarget
        if (!featureTarget) return false
        if (!featureTarget.properties) return false
        return featureTarget.properties.meta === type
    }
}

export function isShiftMousedown(e: OriginalEventHolder): boolean {
    if (!e.originalEvent) return false
    if (!e.originalEvent.shiftKey) return false
    return e.originalEvent.button === MAIN_MOUSE_BUTTON
}

export function isActiveFeature(e: TargetEvent): boolean {
    if (!e.featureTarget) return false
    if (!e.featureTarget.properties) return false
    return (
        e.featureTarget.properties.active === Constants.activeStates.ACTIVE &&
        e.featureTarget.properties.meta === Constants.meta.FEATURE
    )
}

export function isInactiveFeature(e: TargetEvent): boolean {
    if (!e.featureTarget) return false
    if (!e.featureTarget.properties) return false
    return (
        e.featureTarget.properties.active === Constants.activeStates.INACTIVE &&
        e.featureTarget.properties.meta === Constants.meta.FEATURE
    )
}

export function noTarget(e: TargetEvent): boolean {
    return e.featureTarget === undefined
}

export function isFeature(e: TargetEvent): boolean {
    if (!e.featureTarget) return false
    if (!e.featureTarget.properties) return false
    return e.featureTarget.properties.meta === Constants.meta.FEATURE
}

export function isVertex(e: TargetEvent): boolean {
    const featureTarget = e.featureTarget
    if (!featureTarget) return false
    if (!featureTarget.properties) return false
    return featureTarget.properties.meta === Constants.meta.VERTEX
}

export function isShiftDown(e: OriginalEventHolder): boolean {
    if (!e.originalEvent) return false
    return e.originalEvent.shiftKey === true
}

export function isEscapeKey(e: { keyCode: number }): boolean {
    return e.keyCode === KEY_CODE_ESCAPE
}

export function isEnterKey(e: { keyCode: number }): boolean {
    return e.keyCode === KEY_CODE_ENTER
}

export function isTrue(): boolean {
    return true
}
