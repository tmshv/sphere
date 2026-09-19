import { render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { InfoRow } from "."

const LONG_VALUE = "POLYGON ((37.61 55.75, 37.62 55.75, 37.62 55.76, 37.61 55.76, 37.61 55.75))"

describe("InfoRow", () => {
    it("renders its label beside its value", () => {
        render(<InfoRow label={"Size"} value={"1.2 MB"} />)
        expect(screen.getByText("Size")).toBeInTheDocument()
        expect(screen.getByText("1.2 MB")).toBeInTheDocument()
    })

    it("leaves the value selectable so it can be copied", () => {
        render(<InfoRow label={"Size"} value={"1.2 MB"} />)
        expect(getComputedStyle(screen.getByText("1.2 MB")).userSelect).toBe("text")
    })

    it("keeps the label out of a selection, because a caption is not data", () => {
        render(<InfoRow label={"Size"} value={"1.2 MB"} />)
        expect(getComputedStyle(screen.getByText("Size")).userSelect).toBe("none")
    })

    it("selects the label too when it is data rather than a caption", () => {
        render(<InfoRow label={"region"} value={"String"} labelIsData />)
        expect(getComputedStyle(screen.getByText("region")).userSelect).toBe("text")
    })

    it("ellipsizes a long value instead of widening the row", () => {
        render(<InfoRow label={"Bounds"} value={LONG_VALUE} />)
        const style = getComputedStyle(screen.getByText(LONG_VALUE))

        expect(style.textOverflow).toBe("ellipsis")
        expect(style.whiteSpace).toBe("nowrap")
        // Without this a flex child refuses to shrink below its text, and the
        // ellipsis never gets a chance to appear.
        expect(Number.parseFloat(style.minWidth)).toBe(0)
    })

    it("holds the caption beside a long value at its full width", () => {
        render(<InfoRow label={"Bounds"} value={LONG_VALUE} />)
        expect(getComputedStyle(screen.getByText("Bounds")).flexShrink).toBe("0")
    })

    it("ellipsizes a long label the same way", () => {
        render(<InfoRow label={LONG_VALUE} value={12} labelIsData />)
        const style = getComputedStyle(screen.getByText(LONG_VALUE))

        expect(style.textOverflow).toBe("ellipsis")
        expect(style.whiteSpace).toBe("nowrap")
        expect(Number.parseFloat(style.minWidth)).toBe(0)
    })

    it("holds the value beside a long label at its full width", () => {
        // Overflow is shared out in proportion to length, so a value left free
        // to shrink loses the few pixels that hide a count behind an ellipsis.
        render(<InfoRow label={LONG_VALUE} value={1204} labelIsData />)
        expect(getComputedStyle(screen.getByText("1204")).flexShrink).toBe("0")
    })
})
