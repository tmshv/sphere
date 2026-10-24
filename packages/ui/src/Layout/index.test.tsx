import { render, screen } from "../test-utils"
import { describe, expect, it } from "vitest"
import { GAP_PX, Row, Stack } from "."

describe("GAP_PX", () => {
    it("maps gap tokens to today's pixels", () => {
        expect(GAP_PX).toEqual({ xxs: 2, xs: 4, sm: 12, md: 16 })
    })
})

describe("Stack", () => {
    it("renders its children in a column with the gap token", () => {
        render(
            <Stack gap={"md"} align={"stretch"}>
                <span>one</span>
                <span>two</span>
            </Stack>,
        )
        const stack = screen.getByText("one").parentElement
        expect(screen.getByText("two")).toBeInTheDocument()
        expect(stack).toHaveStyle({ display: "flex", flexDirection: "column", gap: "16px", alignItems: "stretch" })
    })

    it("passes className and style through", () => {
        render(
            <Stack className={"custom"} style={{ marginBottom: 12 }}>
                <span>child</span>
            </Stack>,
        )
        const stack = screen.getByText("child").parentElement
        expect(stack).toHaveClass("custom")
        expect(stack).toHaveStyle({ marginBottom: "12px" })
    })
})

describe("Row", () => {
    it("renders its children in a row with gap, alignment and justification", () => {
        render(
            <Row gap={"xs"} align={"center"} justify={"between"}>
                <span>left</span>
                <span>right</span>
            </Row>,
        )
        const row = screen.getByText("left").parentElement
        expect(screen.getByText("right")).toBeInTheDocument()
        expect(row).toHaveStyle({
            display: "flex",
            flexDirection: "row",
            gap: "4px",
            alignItems: "center",
            justifyContent: "space-between",
        })
    })

    it("gives every child equal width when grow is set", () => {
        render(
            <Row grow>
                <span>a</span>
                <span>b</span>
            </Row>,
        )
        expect(screen.getByText("a")).toHaveStyle({ flexGrow: "1", flexBasis: "0", minWidth: "0" })
        expect(screen.getByText("b")).toHaveStyle({ flexGrow: "1", flexBasis: "0", minWidth: "0" })
    })

    it("passes className and style through", () => {
        render(
            <Row className={"custom"} style={{ marginTop: 4 }}>
                <span>child</span>
            </Row>,
        )
        const row = screen.getByText("child").parentElement
        expect(row).toHaveClass("custom")
        expect(row).toHaveStyle({ marginTop: "4px" })
    })
})
