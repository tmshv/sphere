import { afterEach, describe, expect, it } from "vitest"
import { focusVisibleStyle, hoverStyle } from "./test-utils"

function addStyles(css: string) {
    const style = document.createElement("style")
    style.textContent = css
    document.head.append(style)
    return style
}

describe("state style helpers", () => {
    afterEach(() => {
        for (const style of document.head.querySelectorAll("style")) {
            style.remove()
        }
    })

    it("finds a real state rule in a list that also holds a :not(state) selector", () => {
        addStyles(`
            .tab:focus:not(:focus-visible), .tab:focus-visible { box-shadow: 0 0 0 3px red; }
        `)
        const element = document.createElement("button")
        element.className = "tab"
        document.body.append(element)

        expect(focusVisibleStyle(element, "box-shadow")).toBe("0 0 0 3px red")
        element.remove()
    })

    it("ignores a rule that only styles the absence of the state", () => {
        addStyles(`.tab:focus:not(:focus-visible) { box-shadow: none; }`)
        const element = document.createElement("button")
        element.className = "tab"
        document.body.append(element)

        expect(focusVisibleStyle(element, "box-shadow")).toBe("")
        element.remove()
    })

    it("reads hover rules", () => {
        addStyles(`.tab:hover { color: red; }`)
        const element = document.createElement("button")
        element.className = "tab"
        document.body.append(element)

        expect(hoverStyle(element, "color")).toBe("red")
        element.remove()
    })
})
