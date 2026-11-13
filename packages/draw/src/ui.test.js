import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import ui from "./ui"

function createMockContext({ position, controls } = {}) {
    const container = document.createElement("div")
    document.body.appendChild(container)

    const controlContainer = document.createElement("div")
    controlContainer.className = `maplibregl-ctrl-${position || "top-left"}`
    container.appendChild(controlContainer)

    return {
        context: {
            container,
            options: {
                controls,
                keybindings: true,
            },
            api: {
                trash: vi.fn(),
            },
            events: {
                changeMode: vi.fn(),
                // src/ui.js calls ctx.events.trash (not api.trash); the old DOM swallowed the TypeError, happy-dom rethrows it
                trash: vi.fn(),
            },
        },
        cleanup() {
            container.remove()
        },
        getControlContainer() {
            return controlContainer
        },
    }
}

function getButtons(div) {
    return Array.prototype.slice.call(div.getElementsByClassName("maplibre-gl-draw_ctrl-draw-btn"))
}

describe("ui container classes", () => {
    let context
    let cleanup
    let testUi

    beforeAll(() => {
        ;({ context, cleanup } = createMockContext())
        testUi = ui(context)
    })

    afterAll(() => {
        cleanup()
    })

    // Each sub-test relies on state from the prior sub-tests

    it("starts with empty class", () => {
        expect(context.container.className, "confirm that class starts empty").toBe("")
    })

    it("update all classes", () => {
        testUi.queueMapClasses({
            mode: "direct_select",
            feature: "vertex",
            mouse: "move",
        })
        testUi.updateMapClasses()
        expect(context.container.classList.contains("mode-direct_select"), "mode class set").toBeTruthy()
        expect(context.container.classList.contains("feature-vertex"), "feature class set").toBeTruthy()
        expect(context.container.classList.contains("mouse-move"), "mouse class set").toBeTruthy()
    })

    it("update only feature class", () => {
        testUi.queueMapClasses({
            feature: "midpoint",
        })
        testUi.updateMapClasses()
        expect(context.container.classList.contains("mode-direct_select"), "mode class remains").toBeTruthy()
        expect(context.container.classList.contains("feature-midpoint"), "feature class updated").toBeTruthy()
        expect(context.container.classList.contains("mouse-move"), "mouse class remains").toBeTruthy()
    })

    it("update mode and mouse classes", () => {
        testUi.queueMapClasses({
            mode: "foo",
            mouse: "bar",
        })
        testUi.updateMapClasses()
        expect(context.container.classList.contains("mode-foo"), "mode class updated").toBeTruthy()
        expect(context.container.classList.contains("feature-midpoint"), "feature class remains").toBeTruthy()
        expect(context.container.classList.contains("mouse-bar"), "mouse class updated").toBeTruthy()
    })

    it("remove only feature class", () => {
        testUi.queueMapClasses({
            feature: null,
        })
        testUi.updateMapClasses()
        expect(context.container.classList.contains("mode-foo"), "mode class remains").toBeTruthy()
        expect(context.container.className.indexOf("feature-") === -1, "feature class removed").toBeTruthy()
        expect(context.container.classList.contains("mouse-bar"), "mouse class remains").toBeTruthy()
    })

    it("remove all classes", () => {
        testUi.queueMapClasses({
            feature: null,
            mode: null,
            mouse: null,
        })
        testUi.updateMapClasses()
        expect(context.container.className.indexOf("mode-") === -1, "mode class removed").toBeTruthy()
        expect(context.container.className.indexOf("feature-") === -1, "feature class still gone").toBeTruthy()
        expect(context.container.className.indexOf("mouse-") === -1, "mouse class removed").toBeTruthy()
    })
})

describe("ui buttons", () => {
    it("with no options.controls", () => {
        const { context, cleanup } = createMockContext()
        const testUi = ui(context)

        const div = testUi.addButtons()
        expect(getButtons(div), "still no buttons").toEqual([])

        cleanup()
    })

    it("with one options.controls", () => {
        const { context, cleanup } = createMockContext({
            controls: {
                line_string: true,
            },
        })
        const testUi = ui(context)

        const div = testUi.addButtons()
        const buttons = getButtons(div)
        expect(buttons.length, "one button added").toBe(1)
        expect(buttons[0].classList.contains("maplibre-gl-draw_line"), "has line class").toBeTruthy()
        expect(buttons[0].classList.contains("maplibre-gl-draw_ctrl-draw-btn"), "has control class").toBeTruthy()

        cleanup()
    })

    it("control group container inserted above attribution control, in control container, by addButtons", () => {
        const { context, cleanup, getControlContainer } = createMockContext({
            controls: {
                trash: true,
            },
        })

        const controlContainer = getControlContainer()
        const testUi = ui(context)

        expect(
            controlContainer.getElementsByClassName("maplibregl-ctrl-group").length,
            "confirm control group does not exist at first",
        ).toBe(0)

        const controlGroup = testUi.addButtons()
        expect(controlGroup, "control group exists").toBeTruthy()

        cleanup()
    })
})

describe("ui buttons with all options.controls, no attribution control", () => {
    let context
    let cleanup
    let testUi
    let controlGroup
    let lineButton
    let polygonButton
    let pointButton
    let trashButton

    beforeAll(() => {
        ;({ context, cleanup } = createMockContext({
            controls: {
                line_string: true,
                point: true,
                polygon: true,
                trash: true,
            },
        }))
        testUi = ui(context)

        controlGroup = testUi.addButtons()
    })

    afterAll(() => {
        cleanup()
    })

    it("adds all buttons", () => {
        const buttons = getButtons(controlGroup)

        expect(buttons.length, "one button added").toBe(4)

        expect(buttons[0].classList.contains("maplibre-gl-draw_line"), "first button has line class").toBeTruthy()
        expect(
            buttons[0].classList.contains("maplibre-gl-draw_ctrl-draw-btn"),
            "first button has control class",
        ).toBeTruthy()
        expect(buttons[0].parentNode, "first button is in controlGroup").toBe(controlGroup)
        lineButton = buttons[0]

        expect(
            buttons[1].classList.contains("maplibre-gl-draw_polygon"),
            "second button has polygon class",
        ).toBeTruthy()
        expect(
            buttons[1].classList.contains("maplibre-gl-draw_ctrl-draw-btn"),
            "second button has control class",
        ).toBeTruthy()
        expect(buttons[1].parentNode, "second button is in controlGroup").toBe(controlGroup)
        polygonButton = buttons[1]
        expect(buttons[2].classList.contains("maplibre-gl-draw_point"), "third button has point class").toBeTruthy()
        expect(
            buttons[2].classList.contains("maplibre-gl-draw_ctrl-draw-btn"),
            "third button has control class",
        ).toBeTruthy()
        expect(buttons[2].parentNode, "third button is in controlGroup").toBe(controlGroup)
        pointButton = buttons[2]
        expect(buttons[3].classList.contains("maplibre-gl-draw_trash"), "fourth button has trash class").toBeTruthy()
        expect(
            buttons[3].classList.contains("maplibre-gl-draw_ctrl-draw-btn"),
            "fourth button has control class",
        ).toBeTruthy()
        expect(buttons[3].parentNode, "fourth button is in controlGroup").toBe(controlGroup)
        trashButton = buttons[3]
    })

    it("click line button", () => {
        lineButton.click()

        expect(lineButton.classList.contains("active"), "line button is active").toBeTruthy()
        expect(polygonButton.classList.contains("active"), "polygon button is inactive").toBeFalsy()
        expect(pointButton.classList.contains("active"), "point button is inactive").toBeFalsy()
        expect(trashButton.classList.contains("active"), "trash button is inactive").toBeFalsy()

        expect(context.events.changeMode, "changeMode called").toHaveBeenCalledTimes(1)
        expect(context.events.changeMode, "with correct arguments").toHaveBeenNthCalledWith(1, "draw_line_string")
        context.events.changeMode.mockClear()
    })

    it("click polygon button", () => {
        polygonButton.click()

        expect(lineButton.classList.contains("active"), "line button is inactive").toBeFalsy()
        expect(polygonButton.classList.contains("active"), "polygon button is active").toBeTruthy()
        expect(pointButton.classList.contains("active"), "point button is inactive").toBeFalsy()
        expect(trashButton.classList.contains("active"), "trash button is inactive").toBeFalsy()

        expect(context.events.changeMode, "changeMode called").toHaveBeenCalledTimes(1)
        expect(context.events.changeMode, "with correct arguments").toHaveBeenNthCalledWith(1, "draw_polygon")
        context.events.changeMode.mockClear()
    })

    it("programmatically activate point button, then programmatically deactivate", () => {
        testUi.setActiveButton("point")

        expect(lineButton.classList.contains("active"), "line button is inactive").toBeFalsy()
        expect(polygonButton.classList.contains("active"), "polygon button is inactive").toBeFalsy()
        expect(pointButton.classList.contains("active"), "point button is active").toBeTruthy()
        expect(trashButton.classList.contains("active"), "trash button is inactive").toBeFalsy()
        expect(context.events.changeMode, "changeMode not called").toHaveBeenCalledTimes(0)

        testUi.setActiveButton()

        expect(lineButton.classList.contains("active"), "line button is inactive").toBeFalsy()
        expect(polygonButton.classList.contains("active"), "polygon button is inactive").toBeFalsy()
        expect(pointButton.classList.contains("active"), "point button is inactive").toBeFalsy()
        expect(trashButton.classList.contains("active"), "trash button is inactive").toBeFalsy()
        expect(context.events.changeMode, "changeMode not called").toHaveBeenCalledTimes(0)
    })

    it("click trash button", () => {
        trashButton.click()

        expect(lineButton.classList.contains("active"), "line button is inactive").toBeFalsy()
        expect(polygonButton.classList.contains("active"), "polygon button is inactive").toBeFalsy()
        expect(pointButton.classList.contains("active"), "point button is inactive").toBeFalsy()
        expect(trashButton.classList.contains("active"), "trash button is inactive").toBeFalsy()

        expect(context.events.changeMode, "changeMode not called").toHaveBeenCalledTimes(0)
    })
})
