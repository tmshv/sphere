import * as Constants from "./constants"
import type { DrawControls, MapClasses } from "./types"

const classTypes = ["mode", "feature", "mouse"] as const

const TRASH_BUTTON_ID = "trash"

type ClassType = (typeof classTypes)[number]
type CurrentMapClasses = Record<ClassType, string | null | undefined>

/** What the UI needs from the Draw context. */
export interface UiContext {
    /** `false` once Draw is removed from the map; a bare test context leaves it out. */
    readonly attached?: boolean
    readonly container: HTMLElement
    readonly options: {
        readonly controls?: DrawControls
        readonly keybindings: boolean
    }
    readonly events: {
        changeMode(mode: string): void
        trash(): void
        combineFeatures(): void
        uncombineFeatures(): void
    }
}

interface ControlButtonOptions {
    container: HTMLElement
    className: string
    title: string
    onActivate: () => void
    onDeactivate?: () => void
}

export interface DrawUi {
    setActiveButton(id?: string): void
    queueMapClasses(options: MapClasses): void
    updateMapClasses(): void
    clearMapClasses(): void
    addButtons(): HTMLElement
    removeButtons(): void
}

export default function ui(ctx: UiContext): DrawUi {
    const buttonElements: Partial<Record<string, HTMLButtonElement>> = {}
    let activeButton: HTMLButtonElement | null = null

    let currentMapClasses: CurrentMapClasses = {
        mode: null, // e.g. mode-direct_select
        feature: null, // e.g. feature-vertex
        mouse: null, // e.g. mouse-move
    }

    let nextMapClasses: CurrentMapClasses = {
        mode: null,
        feature: null,
        mouse: null,
    }

    function clearMapClasses() {
        queueMapClasses({ mode: null, feature: null, mouse: null })
        updateMapClasses()
    }

    function queueMapClasses(options: MapClasses) {
        nextMapClasses = { ...nextMapClasses, ...options }
    }

    function updateMapClasses() {
        if (ctx.attached === false) return
        const container = ctx.container
        if (!container) return

        const classesToRemove: string[] = []
        const classesToAdd: string[] = []

        for (const type of classTypes) {
            if (nextMapClasses[type] === currentMapClasses[type]) continue

            classesToRemove.push(`${type}-${currentMapClasses[type]}`)
            if (nextMapClasses[type] !== null) {
                classesToAdd.push(`${type}-${nextMapClasses[type]}`)
            }
        }

        if (classesToRemove.length > 0) {
            container.classList.remove(...classesToRemove)
        }

        if (classesToAdd.length > 0) {
            container.classList.add(...classesToAdd)
        }

        currentMapClasses = { ...currentMapClasses, ...nextMapClasses }
    }

    function createControlButton(id: string, options: ControlButtonOptions) {
        const button = document.createElement("button")
        button.className = `${Constants.classes.CONTROL_BUTTON} ${options.className}`
        button.setAttribute("title", options.title)
        options.container.appendChild(button)

        button.addEventListener(
            "click",
            e => {
                e.preventDefault()
                e.stopPropagation()

                const clickedButton = e.target
                if (clickedButton === activeButton) {
                    deactivateButtons()
                    options.onDeactivate?.()
                    return
                }

                setActiveButton(id)
                options.onActivate()
            },
            true,
        )

        return button
    }

    function deactivateButtons() {
        if (!activeButton) return
        activeButton.classList.remove(Constants.classes.ACTIVE_BUTTON)
        activeButton = null
    }

    function setActiveButton(id?: string) {
        deactivateButtons()

        const button = id === undefined ? undefined : buttonElements[id]
        if (!button) return

        if (button && id !== TRASH_BUTTON_ID) {
            button.classList.add(Constants.classes.ACTIVE_BUTTON)
            activeButton = button
        }
    }

    /** A drawing tool's button title, with the key that starts it when keybindings are on. */
    function toolTitle(name: string, tool: keyof typeof Constants.toolKeys): string {
        return ctx.options.keybindings ? `${name} (${Constants.toolKeys[tool]})` : name
    }

    function addButtons() {
        const controls = ctx.options.controls
        const controlGroup = document.createElement("div")
        controlGroup.className = `${Constants.classes.CONTROL_GROUP} ${Constants.classes.CONTROL_BASE}`

        if (!controls) return controlGroup

        if (controls[Constants.types.LINE]) {
            buttonElements[Constants.types.LINE] = createControlButton(Constants.types.LINE, {
                container: controlGroup,
                className: Constants.classes.CONTROL_BUTTON_LINE,
                title: toolTitle("LineString tool", Constants.types.LINE),
                onActivate: () => ctx.events.changeMode(Constants.modes.DRAW_LINE_STRING),
                onDeactivate: () => ctx.events.trash(),
            })
        }

        if (controls[Constants.types.POLYGON]) {
            buttonElements[Constants.types.POLYGON] = createControlButton(Constants.types.POLYGON, {
                container: controlGroup,
                className: Constants.classes.CONTROL_BUTTON_POLYGON,
                title: toolTitle("Polygon tool", Constants.types.POLYGON),
                onActivate: () => ctx.events.changeMode(Constants.modes.DRAW_POLYGON),
                onDeactivate: () => ctx.events.trash(),
            })
        }

        if (controls[Constants.types.POINT]) {
            buttonElements[Constants.types.POINT] = createControlButton(Constants.types.POINT, {
                container: controlGroup,
                className: Constants.classes.CONTROL_BUTTON_POINT,
                title: toolTitle("Marker tool", Constants.types.POINT),
                onActivate: () => ctx.events.changeMode(Constants.modes.DRAW_POINT),
                onDeactivate: () => ctx.events.trash(),
            })
        }

        if (controls.trash) {
            buttonElements.trash = createControlButton(TRASH_BUTTON_ID, {
                container: controlGroup,
                className: Constants.classes.CONTROL_BUTTON_TRASH,
                title: "Delete",
                onActivate: () => {
                    ctx.events.trash()
                },
            })
        }

        if (controls.combine_features) {
            buttonElements.combine_features = createControlButton("combineFeatures", {
                container: controlGroup,
                className: Constants.classes.CONTROL_BUTTON_COMBINE_FEATURES,
                title: "Combine",
                onActivate: () => {
                    ctx.events.combineFeatures()
                },
            })
        }

        if (controls.uncombine_features) {
            buttonElements.uncombine_features = createControlButton("uncombineFeatures", {
                container: controlGroup,
                className: Constants.classes.CONTROL_BUTTON_UNCOMBINE_FEATURES,
                title: "Uncombine",
                onActivate: () => {
                    ctx.events.uncombineFeatures()
                },
            })
        }

        return controlGroup
    }

    function removeButtons() {
        for (const buttonId of Object.keys(buttonElements)) {
            const button = buttonElements[buttonId]
            if (button?.parentNode) {
                button.parentNode.removeChild(button)
            }
            delete buttonElements[buttonId]
        }
    }

    return {
        setActiveButton,
        queueMapClasses,
        updateMapClasses,
        clearMapClasses,
        addButtons,
        removeButtons,
    }
}
