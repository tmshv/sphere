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
