import { renderToStaticMarkup } from "react-dom/server"
import * as icons from "./index"

const SIZE_PX = 16
const COLOR = "red"
// Outline icons paint with stroke, filled ones with fill.
const COLORED = new RegExp(`(stroke|fill)="${COLOR}"`)

const CASES = Object.entries(icons).map(([name, Icon]) => ({ name, Icon }))

describe("@sphere/icons", () => {
    test.each(CASES)("$name renders an svg with the given size and color", ({ Icon }) => {
        const markup = renderToStaticMarkup(<Icon size={SIZE_PX} color={COLOR} />)

        expect(markup).toMatch(/^<svg/)
        expect(markup).toContain(`width="${SIZE_PX}"`)
        expect(markup).toMatch(COLORED)
    })
})

describe("IconDisclosure", () => {
    it("renders a filled svg of the given size", () => {
        const markup = renderToStaticMarkup(<icons.IconDisclosure size={SIZE_PX} />)

        expect(markup).toContain(`width="${SIZE_PX}"`)
        expect(markup).toContain(`height="${SIZE_PX}"`)
        expect(markup).toContain('fill="currentColor"')
    })

    it("passes className through", () => {
        expect(renderToStaticMarkup(<icons.IconDisclosure className="probe" />)).toContain('class="probe"')
    })
})
