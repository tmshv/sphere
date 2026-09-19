import { formatBytes, formatEpoch } from "./format"

describe("formatBytes function", () => {
    test("formats zero bytes", () => {
        expect(formatBytes(0)).toBe("0 B")
    })

    test("formats sub-kilobyte sizes without a decimal", () => {
        expect(formatBytes(512)).toBe("512 B")
    })

    test("formats exactly one kilobyte", () => {
        expect(formatBytes(1024)).toBe("1.0 KB")
    })

    test("formats fractional kilobytes", () => {
        expect(formatBytes(1536)).toBe("1.5 KB")
    })

    test("formats megabytes", () => {
        expect(formatBytes(1024 * 1024)).toBe("1.0 MB")
    })

    test("formats gigabytes", () => {
        expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB")
    })

    test("clamps at terabytes for very large values", () => {
        expect(formatBytes(1024 * 1024 * 1024 * 1024 * 5)).toBe("5.0 TB")
    })
})

describe("formatEpoch function", () => {
    test("formats a Unix-epoch-seconds string as a UTC datetime", () => {
        expect(formatEpoch("1700000000")).toBe("2023-11-14 22:13:20")
    })

    test("formats the Unix epoch itself", () => {
        expect(formatEpoch("0")).toBe("1970-01-01 00:00:00")
    })

    test("returns the input unchanged when it is not numeric", () => {
        expect(formatEpoch("not-a-number")).toBe("not-a-number")
    })
})
