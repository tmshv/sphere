import { describe, expect, it } from "vitest"
import { render, screen } from "../../test-utils"
import { Badge } from "./Badge"

describe("Badge", () => {
    it("renders children", () => {
        render(<Badge>12</Badge>)
        expect(screen.getByText("12")).toBeTruthy()
    })
})
