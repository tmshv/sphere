import logger from "@/logger"
import { describe, expect, it, vi } from "vitest"
import { fireAndLog } from "./fire-and-log"

vi.mock("@/logger", () => ({
    default: { error: vi.fn() },
}))

describe("fireAndLog", () => {
    it("runs the task when the returned function is called", () => {
        const task = vi.fn().mockResolvedValue(undefined)
        fireAndLog(task, "Copy failed")()
        expect(task).toHaveBeenCalledTimes(1)
    })

    it("logs a rejected task", async () => {
        fireAndLog(() => Promise.reject(new Error("x")), "Copy failed")()
        await expect.poll(() => logger.error).toHaveBeenCalledWith("Copy failed: %s", expect.any(Error))
    })
})
