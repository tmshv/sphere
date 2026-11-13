import type { DrawFeatureId, FlushResult, WorkingSet, WorkingSetScope } from "@/types"
import type { Bbox } from "@/types/bbox"
import { WorkingSetLoader, type WorkingSetLoaderOptions } from "./working-set-loader"

function feature(id: DrawFeatureId): GeoJSON.Feature {
    return { type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates: [1, 2] } }
}

function workingSet(ids: DrawFeatureId[], overCap = false): WorkingSet {
    return { features: { type: "FeatureCollection", features: ids.map(feature) }, overCap }
}

function deferred<T>() {
    let resolve: (v: T) => void = () => {}
    let reject: (e: unknown) => void = () => {}
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

const flushAsync = () => new Promise(resolve => setTimeout(resolve, 0))

const BBOX: Bbox = [0, 1, 2, 3]
const OTHER_BBOX: Bbox = [4, 5, 6, 7]

function setup(overrides: Partial<WorkingSetLoaderOptions> = {}) {
    const loadedIntoDraw: DrawFeatureId[][] = []
    const unloadedFromDraw: DrawFeatureId[][] = []
    const loading: boolean[] = []
    const overCap: (WorkingSetScope["type"] | undefined)[] = []
    const errors: unknown[] = []
    const pinned = new Set<DrawFeatureId>()
    const fetchWorkingSet = vi.fn<WorkingSetLoaderOptions["fetchWorkingSet"]>(() => Promise.resolve(workingSet([1])))
    const getSelectionIds = vi.fn<WorkingSetLoaderOptions["getSelectionIds"]>(() => Promise.resolve([]))
    const flush = vi.fn<() => Promise<FlushResult>>(() => Promise.resolve({ ok: true }))
    const createdIds = vi.fn<() => number[]>(() => [])
    const options: WorkingSetLoaderOptions = {
        sourceId: "s1",
        cap: 10,
        draw: {
            load: fc => {
                loadedIntoDraw.push(fc.features.flatMap(f => (f.id === undefined ? [] : [f.id])))
            },
            unload: ids => {
                unloadedFromDraw.push(ids)
            },
        },
        queue: { flush, createdIds },
        pinned,
        fetchWorkingSet,
        getSelectionIds,
        onLoading: value => loading.push(value),
        onOverCap: value => overCap.push(value),
        onError: err => errors.push(err),
        ...overrides,
    }
    const loader = new WorkingSetLoader(options)
    return {
        loader,
        loadedIntoDraw,
        unloadedFromDraw,
        loading,
        overCap,
        errors,
        pinned,
        fetchWorkingSet,
        getSelectionIds,
        flush,
        createdIds,
    }
}

describe("WorkingSetLoader: begin", () => {
    test("loads the selection when it belongs to the source", async () => {
        const t = setup()
        t.getSelectionIds.mockResolvedValue([4, 5])

        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledWith("s1", { type: "ids", ids: [4, 5] }, 10)
        expect(t.loadedIntoDraw).toEqual([[1]])
        expect(t.loading.at(-1)).toBe(false)
    })

    test("loads the viewport otherwise", async () => {
        const t = setup()

        t.loader.begin({ selectionSourceId: "s2", bbox: BBOX })
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledWith("s1", { type: "bbox", bbox: BBOX }, 10)
    })

    test("reports a failed selection read and stops loading", async () => {
        const t = setup()
        t.getSelectionIds.mockRejectedValue("ipc down")

        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()

        expect(t.errors).toEqual(["ipc down"])
        expect(t.loading.at(-1)).toBe(false)
        expect(t.fetchWorkingSet).not.toHaveBeenCalled()
    })

    test("does nothing after dispose", async () => {
        const t = setup()
        t.getSelectionIds.mockRejectedValue("ipc down")

        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        t.loader.dispose()
        await flushAsync()

        expect(t.errors).toEqual([])
        expect(t.fetchWorkingSet).not.toHaveBeenCalled()
    })
})

describe("WorkingSetLoader: moves", () => {
    test("a viewport scope re-queries after a move and unloads untouched features that left", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.fetchWorkingSet.mockResolvedValue(workingSet([2]))

        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenLastCalledWith("s1", { type: "bbox", bbox: OTHER_BBOX }, 10)
        expect(t.loadedIntoDraw).toEqual([[1], [2]])
        expect(t.unloadedFromDraw).toEqual([[], [1]])
    })

    test("a selection scope does not re-query", async () => {
        const t = setup()
        t.getSelectionIds.mockResolvedValue([1])
        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()

        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledOnce()
    })

    test("no refresh starts while the session end is pending", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.setPending(true)
        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledOnce()
    })

    test("refreshes again once the session end settled without ending the session", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.setPending(true)
        t.loader.setPending(false)
        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledTimes(2)
    })

    test("no refresh starts after dispose", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.dispose()
        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledOnce()
    })

    test("pinned and created features are never loaded over or unloaded", async () => {
        const t = setup()
        t.fetchWorkingSet.mockResolvedValue(workingSet([1, 2]))
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.pinned.add(1)
        t.createdIds.mockReturnValue([9])
        t.fetchWorkingSet.mockResolvedValue(workingSet([9, 3]))

        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.loadedIntoDraw.at(-1)).toEqual([3])
        expect(t.unloadedFromDraw.at(-1)).toEqual([2])
    })
})

describe("WorkingSetLoader: stale and failed loads", () => {
    test("a stale result is ignored and only the latest load clears the loading state", async () => {
        const t = setup()
        const first = deferred<WorkingSet>()
        t.fetchWorkingSet.mockReturnValueOnce(first.promise).mockResolvedValueOnce(workingSet([2]))
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.moved(OTHER_BBOX)
        await flushAsync()
        first.resolve(workingSet([1]))
        await flushAsync()

        expect(t.loadedIntoDraw).toEqual([[2]])
        expect(t.loading).toEqual([true, true, false])
    })

    test("an error from a stale load is not reported", async () => {
        const t = setup()
        const first = deferred<WorkingSet>()
        t.fetchWorkingSet.mockReturnValueOnce(first.promise).mockResolvedValueOnce(workingSet([2]))
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.moved(OTHER_BBOX)
        await flushAsync()
        first.reject("no draw session")
        await flushAsync()

        expect(t.errors).toEqual([])
    })

    test("a load still running when the session end starts is dropped, and its error not reported", async () => {
        const t = setup()
        const first = deferred<WorkingSet>()
        t.fetchWorkingSet.mockReturnValueOnce(first.promise)
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.setPending(true)
        first.reject("Source s1 has no draw session")
        await flushAsync()

        expect(t.errors).toEqual([])
        expect(t.loading.at(-1)).toBe(false)
    })

    test("an error from a disposed load is not reported and its result is not applied", async () => {
        const t = setup()
        const first = deferred<WorkingSet>()
        t.fetchWorkingSet.mockReturnValueOnce(first.promise)
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.dispose()
        first.reject("no draw session")
        await flushAsync()

        expect(t.errors).toEqual([])
        expect(t.loadedIntoDraw).toEqual([])
    })

    test("an error from the current load is reported", async () => {
        const t = setup()
        t.fetchWorkingSet.mockRejectedValue("query failed")

        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        expect(t.errors).toEqual(["query failed"])
        expect(t.loading.at(-1)).toBe(false)
    })

    test("loads nothing more once the op queue failed", async () => {
        const t = setup()
        t.flush.mockResolvedValue({ ok: false, error: "boom", dropped: 0 })

        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        expect(t.fetchWorkingSet).not.toHaveBeenCalled()
        expect(t.loading.at(-1)).toBe(false)
    })

    test("over cap loads nothing and reports the scope kind until a load fits again", async () => {
        const t = setup()
        t.fetchWorkingSet.mockResolvedValueOnce(workingSet([], true)).mockResolvedValueOnce(workingSet([2]))

        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        expect(t.loadedIntoDraw).toEqual([])
        expect(t.overCap).toEqual(["bbox"])

        t.loader.moved(OTHER_BBOX)
        await flushAsync()
        expect(t.overCap).toEqual(["bbox", undefined])
        expect(t.loadedIntoDraw).toEqual([[2]])
    })
})
