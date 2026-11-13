import * as Constants from "./constants"

import styles from "./lib/theme"
import modes from "./modes"
import type { DrawModeObject } from "./modes/mode_interface"
import type { DrawControls, DrawStyleLayer } from "./types"

/** Options for `new MapLibreDraw(options)`. Each one left out gets its default. */
export interface DrawOptionsInput {
    displayControlsDefault?: boolean
    keybindings?: boolean
    touchEnabled?: boolean
    boxSelect?: boolean
    clickBuffer?: number
    touchBuffer?: number
    controls?: DrawControls
    styles?: DrawStyleLayer[]
    modes?: Record<string, DrawModeObject>
    defaultMode?: string
    userProperties?: boolean
}

/** Draw's options with defaults applied. Every style has a source. */
export interface DrawOptions {
    defaultMode: string
    keybindings: boolean
    touchEnabled: boolean
    clickBuffer: number
    touchBuffer: number
    boxSelect: boolean
    displayControlsDefault: boolean
    styles: (DrawStyleLayer & { source: string })[]
    modes: Record<string, DrawModeObject>
    controls: Required<DrawControls>
    userProperties: boolean
}

const defaultOptions = {
    defaultMode: Constants.modes.SIMPLE_SELECT,
    keybindings: true,
    touchEnabled: true,
    clickBuffer: 2,
    touchBuffer: 25,
    boxSelect: true,
    displayControlsDefault: true,
    styles,
    modes,
    controls: {},
    userProperties: false,
}

const showControls: Required<DrawControls> = {
    point: true,
    line_string: true,
    polygon: true,
    trash: true,
    combine_features: true,
    uncombine_features: true,
}

const hideControls: Required<DrawControls> = {
    point: false,
    line_string: false,
    polygon: false,
    trash: false,
    combine_features: false,
    uncombine_features: false,
}

type SourceBucket = "hot" | "cold"

function hasSource(style: DrawStyleLayer): style is DrawStyleLayer & { source: string } {
    return Boolean(style.source)
}

function addSources(styles: DrawStyleLayer[], sourceBucket: SourceBucket): (DrawStyleLayer & { source: string })[] {
    return styles.map(style => {
        if (hasSource(style)) return style
        return {
            ...style,
            id: `${style.id}.${sourceBucket}`,
            source: sourceBucket === "hot" ? Constants.sources.HOT : Constants.sources.COLD,
        }
    })
}

export default function setupOptions(options: DrawOptionsInput = {}): DrawOptions {
    const controls: Required<DrawControls> =
        options.displayControlsDefault === false
            ? { ...hideControls, ...options.controls }
            : { ...showControls, ...options.controls }

    const withDefaults = { ...defaultOptions, ...options, controls }

    // Layers with a shared source should be adjacent for performance reasons
    return {
        ...withDefaults,
        styles: addSources(withDefaults.styles, "cold").concat(addSources(withDefaults.styles, "hot")),
    }
}
