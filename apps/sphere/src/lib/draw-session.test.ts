import type { DrawEvent, EditOp, WorkingSetScope } from "@/types"
import { invoke as _invoke } from "@tauri-apps/api/core"
import type { MockedFunction } from "vitest"
import { DrawOpQueue, applyOp, beginDraw, commitDraw, eventToOps, loadWorkingSet, rollbackDraw } from "./draw-session"

type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
const invoke = _invoke as MockedFunction<InvokeFn>

vi.mock("@tauri-apps/api/core", { spy: true })

function feature(id: number | string | undefined): GeoJSON.Feature {
    return { type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates: [1, 2] } }
}

describe("eventToOps", () => {
    test("create", () => {
        const f = feature("abc")
        expect(eventToOps({ type: "draw.create", features: [f] })).toEqual([
            { type: "create", drawId: "abc", feature: f },
        ])
    })

    test("update keeps numeric and string ids", () => {
        const a = feature(12)
        const b = feature("abc")
        expect(eventToOps({ type: "draw.update", features: [a, b] })).toEqual([
            { type: "update", id: 12, feature: a },
            { type: "update", id: "abc", feature: b },
        ])
    })

    test("delete", () => {
        expect(eventToOps({ type: "draw.delete", features: [feature(3), feature("x")] })).toEqual([
            { type: "delete", id: 3 },
            { type: "delete", id: "x" },
        ])
    })

    test.each(["draw.combine", "draw.uncombine"])("%s deletes first, then creates", type => {
        const event: DrawEvent = {
            type,
            deletedFeatures: [feature(1), feature(2)],
            createdFeatures: [feature("n1")],
        }
        const ops = eventToOps(event)
        expect(ops.map(op => op.type)).toEqual(["delete", "delete", "create"])
        expect(ops[0]).toEqual({ type: "delete", id: 1 })
        expect(ops[2]).toEqual({ type: "create", drawId: "n1", feature: feature("n1") })
    })

    test("unknown event gives no ops", () => {
        expect(eventToOps({ type: "draw.selectionchange", features: [feature(1)] })).toEqual([])
    })

    test("missing features give no ops", () => {
        expect(eventToOps({ type: "draw.create" })).toEqual([])
    })

    test("feature without id throws", () => {
        expect(() => eventToOps({ type: "draw.delete", features: [feature(undefined)] })).toThrow()
    })
})

describe("wrappers", () => {
    beforeEach(() => {
        invoke.mockReset()
    })

    test("beginDraw", async () => {
        invoke.mockResolvedValue(undefined)
        await beginDraw("s1")
        expect(invoke).toHaveBeenCalledWith("draw_begin", { id: "s1" })
    })

    test("loadWorkingSet parses features", async () => {
        const fc = { type: "FeatureCollection", features: [feature(1)] }
        invoke.mockResolvedValue({ features: JSON.stringify(fc), overCap: false })
        const scope: WorkingSetScope = { type: "ids", ids: [1] }
        const result = await loadWorkingSet("s1", scope, 100)
        expect(invoke).toHaveBeenCalledWith("draw_get_working_set", { id: "s1", scope, cap: 100 })
        expect(result).toEqual({ features: fc, overCap: false })
    })

    test("loadWorkingSet over cap", async () => {
        invoke.mockResolvedValue({
            features: JSON.stringify({ type: "FeatureCollection", features: [] }),
            overCap: true,
        })
        const result = await loadWorkingSet("s1", { type: "bbox", bbox: [0, 0, 1, 1] }, 5)
        expect(result.overCap).toBe(true)
        expect(result.features.features).toEqual([])
    })

    test("applyOp returns backend id", async () => {
        invoke.mockResolvedValue(7)
        const op: EditOp = { type: "delete", id: 7 }
        expect(await applyOp("s1", op)).toBe(7)
        expect(invoke).toHaveBeenCalledWith("draw_apply", { id: "s1", op })
    })

    test("applyOp returns null for delete", async () => {
        invoke.mockResolvedValue(null)
        expect(await applyOp("s1", { type: "delete", id: 1 })).toBeNull()
    })

    test("commitDraw and rollbackDraw return ids", async () => {
        invoke.mockResolvedValue([1, 2])
        expect(await commitDraw("s1")).toEqual([1, 2])
        expect(invoke).toHaveBeenLastCalledWith("draw_commit", { id: "s1" })
        expect(await rollbackDraw("s1")).toEqual([1, 2])
        expect(invoke).toHaveBeenLastCalledWith("draw_rollback", { id: "s1" })
    })
})

function opId(args: Record<string, unknown> | undefined): number {
    const op = args?.op
    if (typeof op === "object" && op !== null && "id" in op && typeof op.id === "number") {
        return op.id
    }
    throw new Error("unexpected op")
}

describe("DrawOpQueue", () => {
    beforeEach(() => {
        invoke.mockReset()
    })

    function deferred() {
        let resolve: (v: unknown) => void = () => {}
        let reject: (e: unknown) => void = () => {}
        const promise = new Promise((res, rej) => {
            resolve = res
            reject = rej
        })
        return { promise, resolve, reject }
    }

    test("applies in order even if the first resolves later", async () => {
        const first = deferred()
        const started: number[] = []
        invoke.mockImplementation(async (_cmd, args) => {
            const id = opId(args)
            started.push(id)
            return id === 1 ? first.promise : null
        })
        const queue = new DrawOpQueue("s1", () => {})
        queue.enqueue([
            { type: "delete", id: 1 },
            { type: "delete", id: 2 },
        ])
        await Promise.resolve()
        expect(started).toEqual([1])
        first.resolve(null)
        await queue.flush()
        expect(started).toEqual([1, 2])
    })

    test("flush resolves after all ops, including ones added meanwhile", async () => {
        invoke.mockResolvedValue(null)
        const queue = new DrawOpQueue("s1", () => {})
        queue.enqueue([{ type: "delete", id: 1 }])
        const flushed = queue.flush()
        queue.enqueue([{ type: "delete", id: 2 }])
        await flushed
        await queue.flush()
        expect(invoke).toHaveBeenCalledTimes(2)
    })

    test("flush with empty queue resolves", async () => {
        await new DrawOpQueue("s1", () => {}).flush()
    })

    test("clean queue flushes ok", async () => {
        invoke.mockResolvedValue(null)
        const queue = new DrawOpQueue("s1", () => {})
        queue.enqueue([{ type: "delete", id: 1 }])
        expect(await queue.flush()).toEqual({ ok: true })
    })

    test("failure is sticky: reported once, later ops not sent and counted", async () => {
        invoke.mockRejectedValueOnce("boom").mockResolvedValue(null)
        const errors: unknown[] = []
        const queue = new DrawOpQueue("s1", err => errors.push(err))
        queue.enqueue([
            { type: "delete", id: 1 },
            { type: "delete", id: 2 },
        ])
        const first = await queue.flush()
        queue.enqueue([{ type: "delete", id: 3 }])
        const second = await queue.flush()
        expect(first).toEqual({ ok: false, error: "boom", dropped: 1 })
        expect(second).toEqual({ ok: false, error: "boom", dropped: 2 })
        expect(errors).toEqual(["boom"])
        expect(invoke).toHaveBeenCalledTimes(1)
    })

    test("unmappable event fails the queue and sends nothing from it", async () => {
        invoke.mockResolvedValue(null)
        const errors: unknown[] = []
        const queue = new DrawOpQueue("s1", err => errors.push(err))
        queue.enqueueEvent({ type: "draw.delete", features: [feature(1), feature(undefined)] })
        queue.enqueueEvent({ type: "draw.delete", features: [feature(2)] })
        const result = await queue.flush()
        expect(result.ok).toBe(false)
        expect(errors).toHaveLength(1)
        expect(invoke).not.toHaveBeenCalled()
    })

    test("enqueueEvent maps and applies", async () => {
        invoke.mockResolvedValue(null)
        const queue = new DrawOpQueue("s1", () => {})
        queue.enqueueEvent({ type: "draw.delete", features: [feature(5)] })
        expect(await queue.flush()).toEqual({ ok: true })
        expect(invoke).toHaveBeenCalledWith("draw_apply", { id: "s1", op: { type: "delete", id: 5 } })
    })
})

describe("mapping strictness", () => {
    test("created feature with a numeric id is a mapping failure", () => {
        expect(() => eventToOps({ type: "draw.create", features: [feature(4)] })).toThrow()
    })
})

describe("loadWorkingSet validation", () => {
    test("rejects a non FeatureCollection payload", async () => {
        invoke.mockResolvedValue({ features: JSON.stringify({ type: "Feature" }), overCap: false })
        await expect(loadWorkingSet("s1", { type: "ids", ids: [] }, 1)).rejects.toThrow("FeatureCollection")
    })
})
