import { describe, expect, test } from "vitest"
import { sleep } from "./time"

describe("lib/time/sleep", () => {
    test("sleep function should resolve after given time", async () => {
        const start = Date.now()
        await sleep(1000)
        const end = Date.now()
        expect(end - start).toBeGreaterThanOrEqual(1000)
    })

    test("sleep function should resolve with void value", async () => {
        const response = await sleep(500)
        expect(response).toBeUndefined()
    })
})
