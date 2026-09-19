import { render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { AttributeList } from "."
import type { FieldEntry } from "."

const loadingField: FieldEntry = {
    name: "alpha",
    type: "String",
    summary: { kind: "loading" },
}

const numericField: FieldEntry = {
    name: "elevation",
    type: "Number",
    nullCount: 3,
    summary: { kind: "numeric", min: 12, max: 1843, mean: 320, histogram: [1, 4, 2] },
}

const stringField: FieldEntry = {
    name: "region",
    type: "String",
    summary: {
        kind: "string",
        unique: 342,
        topValues: [
            ["Moscow", 1204],
            ["Kazan", 812],
        ],
    },
}

describe("AttributeList", () => {
    it("renders an honest empty state rather than nothing", () => {
        render(<AttributeList fields={[]} />)
        expect(screen.getByText("No attributes")).toBeInTheDocument()
    })

    it("renders a row per field, keyed by name", () => {
        render(<AttributeList fields={[numericField, stringField]} />)
        expect(screen.getByText("elevation")).toBeInTheDocument()
        expect(screen.getByText("region")).toBeInTheDocument()
    })

    it("renders each field's declared type", () => {
        render(<AttributeList fields={[numericField]} />)
        expect(screen.getByText("Number")).toBeInTheDocument()
    })

    it("renders a null count only when it is above zero", () => {
        render(<AttributeList fields={[numericField]} />)
        expect(screen.getByText("3 null")).toBeInTheDocument()

        render(<AttributeList fields={[{ ...numericField, name: "other", nullCount: 0 }]} />)
        expect(screen.queryByText("0 null")).not.toBeInTheDocument()
    })

    it("renders min, max and mean for a numeric summary", () => {
        render(<AttributeList fields={[numericField]} />)
        expect(screen.getByText("min")).toBeInTheDocument()
        expect(screen.getByText("12")).toBeInTheDocument()
        expect(screen.getByText("max")).toBeInTheDocument()
        expect(screen.getByText("1843")).toBeInTheDocument()
        expect(screen.getByText("mean")).toBeInTheDocument()
        expect(screen.getByText("320")).toBeInTheDocument()
    })

    it("omits numeric statistics that are absent", () => {
        const sparse: FieldEntry = {
            name: "sparse",
            type: "Number",
            summary: { kind: "numeric", histogram: [1] },
        }
        render(<AttributeList fields={[sparse]} />)
        expect(screen.queryByText("min")).not.toBeInTheDocument()
        expect(screen.queryByText("max")).not.toBeInTheDocument()
        expect(screen.queryByText("mean")).not.toBeInTheDocument()
    })

    it("renders the unique count and top values for a string summary", () => {
        render(<AttributeList fields={[stringField]} />)
        expect(screen.getByText("342 unique")).toBeInTheDocument()
        expect(screen.getByText("Moscow")).toBeInTheDocument()
        expect(screen.getByText("1204")).toBeInTheDocument()
        expect(screen.getByText("Kazan")).toBeInTheDocument()
    })

    it("reports how many string values are not shown", () => {
        render(<AttributeList fields={[stringField]} />)
        expect(screen.getByText("…340 more")).toBeInTheDocument()
    })

    it("omits the remainder line when every value is shown", () => {
        const complete: FieldEntry = {
            name: "small",
            type: "String",
            summary: { kind: "string", unique: 1, topValues: [["only", 5]] },
        }
        render(<AttributeList fields={[complete]} />)
        expect(screen.queryByText(/more$/)).not.toBeInTheDocument()
    })

    it("reports an unavailable summary rather than rendering blank", () => {
        const failed: FieldEntry = {
            name: "broken",
            type: "String",
            summary: { kind: "error" },
        }
        render(<AttributeList fields={[failed]} />)
        expect(screen.getByText("stats unavailable")).toBeInTheDocument()
    })

    it("renders a field whose stats have not arrived without its summary text", () => {
        render(<AttributeList fields={[loadingField]} />)
        expect(screen.getByText("alpha")).toBeInTheDocument()
        expect(screen.queryByText("stats unavailable")).not.toBeInTheDocument()
        expect(screen.queryByText(/unique/)).not.toBeInTheDocument()
    })

    it("makes its text non-selectable", () => {
        const { container } = render(<AttributeList fields={[numericField]} />)
        const root = container.firstElementChild
        expect(root).not.toBeNull()
        expect(root && getComputedStyle(root).userSelect).toBe("none")
    })

    it("lets the data inside it be selected even so", () => {
        render(<AttributeList fields={[numericField, stringField]} />)

        // A column name, a statistic and a frequent value are all worth
        // copying; the captions around them are not.
        expect(getComputedStyle(screen.getByText("elevation")).userSelect).toBe("text")
        expect(getComputedStyle(screen.getByText("1843")).userSelect).toBe("text")
        expect(getComputedStyle(screen.getByText("Moscow")).userSelect).toBe("text")
        expect(getComputedStyle(screen.getByText("max")).userSelect).toBe("none")
    })

    it("ellipsizes a long field name instead of pushing its type off the row", () => {
        const longName: FieldEntry = {
            name: "a_very_long_column_name_from_some_generated_export",
            type: "String",
            summary: { kind: "loading" },
        }
        render(<AttributeList fields={[longName]} />)
        const style = getComputedStyle(screen.getByText(longName.name))

        expect(style.textOverflow).toBe("ellipsis")
        expect(Number.parseFloat(style.minWidth)).toBe(0)
    })
})
