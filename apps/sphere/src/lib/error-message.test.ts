import { errorMessage } from "./error-message"

describe("errorMessage", () => {
    test("uses the message of an Error", () => {
        expect(errorMessage(new Error("boom"))).toBe("boom")
    })

    test("passes a string through (Tauri commands reject with strings)", () => {
        expect(errorMessage("Source s1 is not an in-memory source")).toBe("Source s1 is not an in-memory source")
    })

    test("stringifies anything else", () => {
        expect(errorMessage(42)).toBe("42")
    })
})
