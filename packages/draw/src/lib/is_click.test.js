import { describe, expect, it } from "vitest"
import isClick from "./is_click"

// By adding these values as options and stating them in the test,
// we can know the calculation works from the tests, but tweak
// the actual constants in `is_click.js` without having to
// rewrite tests.
const testOptions = {
    fineTolerance: 4,
    grossTolerance: 12,
    interval: 500,
}

describe("isClick", () => {
    it("isClick easy", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        expect(isClick({}, b, testOptions), "true when start is missing point and time").toBe(true)
        expect(isClick({ time: 2000 }, b, testOptions), "true when start has only time").toBe(true)
        expect(isClick(a, b, testOptions), "true when start and end match exactly").toBe(true)
    })

    it("isClick when start/end have same time, very close coordinates", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 2, y: 1.5 },
            time: 1,
        }
        expect(isClick(a, b, testOptions)).toBe(true)
    })

    it("isClick when start/end have same coordinates, distant times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 1, y: 1 },
            time: 6000,
        }
        expect(isClick(a, b, testOptions)).toBe(true)
    })

    it("isClick when start/end have very close coordinates, distant times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 2, y: 1.15 },
            time: 6000,
        }
        expect(isClick(a, b, testOptions)).toBe(true)
    })

    it("isClick when moving just under 4, same times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 3.8, y: 3.8 },
            time: 1,
        }
        // Move distance ~3.959798
        expect(isClick(a, b, testOptions)).toBe(true)
    })

    it("isClick when moving just under 4, distant times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 3.8, y: 3.8 },
            time: 6000,
        }
        // Move distance ~3.959798
        expect(isClick(a, b, testOptions)).toBe(true)
    })

    it("isClick when moving just above 4, same times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 3.9, y: 3.9 },
            time: 1,
        }
        // Move distance ~4.101219
        expect(isClick(a, b, testOptions)).toBe(true)
    })

    it("isClick when moving just above 4, very close times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 3.9, y: 3.9 },
            time: 499,
        }
        // Move distance ~4.101219
        expect(isClick(a, b, testOptions)).toBe(true)
    })

    it("isClick when moving just above 4, distant times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 3.9, y: 3.9 },
            time: 6000,
        }
        // Move distance ~4.101219
        expect(isClick(a, b, testOptions)).toBe(false)
    })

    it("isClick when moving just above 4, barely too distant times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 3.9, y: 3.9 },
            time: 501,
        }
        // Move distance ~4.101219
        expect(isClick(a, b, testOptions)).toBe(false)
    })

    it("isClick when moving just below 12, same times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 9.2, y: 9.2 },
            time: 1,
        }
        // Move distance ~11.596551
        expect(isClick(a, b, testOptions)).toBe(true)
    })

    it("isClick when moving just below 12, very close times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 9.2, y: 9.2 },
            time: 499,
        }
        // Move distance ~11.596551
        expect(isClick(a, b, testOptions)).toBe(true)
    })

    it("isClick when moving just below 12, distant times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 9.2, y: 9.2 },
            time: 6000,
        }
        // Move distance ~11.596551
        expect(isClick(a, b, testOptions)).toBe(false)
    })

    it("isClick when moving just below 12, barely too distant times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 9.2, y: 9.2 },
            time: 501,
        }
        // Move distance ~11.596551
        expect(isClick(a, b, testOptions)).toBe(false)
    })

    it("isClick when moving just above 12, same times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 9.5, y: 9.5 },
            time: 1,
        }
        // Move distance ~12.020815
        expect(isClick(a, b, testOptions)).toBe(false)
    })

    it("isClick when moving just above 12, distant times", () => {
        const a = {
            point: { x: 1, y: 1 },
            time: 1,
        }
        const b = {
            point: { x: 9.5, y: 9.5 },
            time: 6000,
        }
        // Move distance ~12.020815
        expect(isClick(a, b, testOptions)).toBe(false)
    })
})
