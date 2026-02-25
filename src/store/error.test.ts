import { describe, test, expect } from "vitest"
import reducer, { errorSlice, selectErrorMessage } from "./error"

const { setError, clear } = errorSlice.actions

const makeRootState = (error: object) => ({ error } as any)

describe("errorSlice reducer", () => {
    test("initial state has no message", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.message).toBeUndefined()
    })

    test("setError sets message", () => {
        const state = reducer(undefined, setError("something went wrong"))
        expect(state.message).toBe("something went wrong")
    })

    test("clear removes message", () => {
        const prev = { message: "some error" }
        const state = reducer(prev, clear())
        expect(state.message).toBeUndefined()
    })

    test("setError overwrites existing message", () => {
        const prev = { message: "first error" }
        const state = reducer(prev, setError("second error"))
        expect(state.message).toBe("second error")
    })
})

describe("selectErrorMessage", () => {
    test("returns undefined when no message", () => {
        expect(selectErrorMessage(makeRootState({ message: undefined }))).toBeUndefined()
    })

    test("returns message string when set", () => {
        expect(selectErrorMessage(makeRootState({ message: "network failure" }))).toBe("network failure")
    })
})
