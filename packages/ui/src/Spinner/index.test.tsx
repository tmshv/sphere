import { render, screen } from "../test-utils"
import { describe, expect, it } from "vitest"
import { Spinner } from "."

describe("Spinner", () => {
    it("is announced as status with default label", () => {
        render(<Spinner />)
        expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
    })

    it("uses a custom label", () => {
        render(<Spinner label={"Saving"} />)
        expect(screen.getByRole("status", { name: "Saving" })).toBeInTheDocument()
    })
})
