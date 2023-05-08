import { describe, expect, test } from "@jest/globals"
import { getStem } from "./path"

describe("getStem function", () => {
    test("returns null if input is empty string", () => {
        expect(getStem("")).toBe(null)
    })

    test("returns the correct stem for a file with a single extension", () => {
        expect(getStem("path/to/file.txt")).toBe("file")
    })

    test("returns the correct stem for a file with multiple extensions", () => {
        expect(getStem("path/to/file.min.js")).toBe("file.min")
    })
})
