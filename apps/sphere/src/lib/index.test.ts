import { describe, expect, test } from "vitest"
import { assertUnreachable } from "./index"

describe("assertUnreachable", () => {
    test("throws an error when called at runtime", () => {
        // At runtime this function always throws — it is a guard for exhaustive
        // switch/if-else branches. TypeScript enforces at compile time that it
        // is only called with type `never`, but we cast here to exercise the
        // runtime behavior.
        expect(() => assertUnreachable("unexpected" as never)).toThrow("Didn't expect to get here")
    })

    test("throws an Error instance", () => {
        let thrown: unknown
        try {
            assertUnreachable(null as never)
        } catch (e) {
            thrown = e
        }
        expect(thrown).toBeInstanceOf(Error)
    })
})
