import { describe, expect, test } from "@jest/globals"
import { getStem } from "./path"

describe("getStem function", () => {
    test("returns null if input is empty string", () => {
        expect(getStem("")).toBe(null)
    })

    test("returns the correct stem of file if input is file.ext", () => {
        expect(getStem("image.png")).toBe("image")
    })

    test("returns the correct stem of file if input is ./file.ext", () => {
        expect(getStem("my-notes.docx")).toBe("my-notes")
    })

    test("returns the correct stem for a file with a single extension", () => {
        expect(getStem("path/to/file.txt")).toBe("file")
    })

    test("returns the correct stem for a file with multiple extensions", () => {
        expect(getStem("path/to/file.min.js")).toBe("file.min")
    })

    test("returns the correct stem for a file with space in filename", () => {
        expect(getStem("path/to/file with space.jpg")).toBe("file with space")
    })

    test("returns the correct stem for a file with no ext", () => {
        expect(getStem("path/to/no_ext")).toBe("no_ext")
    })
})
