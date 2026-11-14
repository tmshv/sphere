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
    const hidden: number[][] = []
    const selections: number[][] = []
    const pinned = new Set<DrawFeatureId>()
    // The viewport holds feature 1; a selection query returns the features asked for
    const fetchWorkingSet = vi.fn<WorkingSetLoaderOptions["fetchWorkingSet"]>((_, scope) =>
        Promise.resolve(workingSet(scope.type === "ids" ? scope.ids : [1])),
    )
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
        onLoaded: ids => hidden.push(ids),
        onSelection: ids => selections.push(ids),
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
        hidden,
        selections,
        pinned,
        fetchWorkingSet,
        getSelectionIds,
        flush,
        createdIds,
    }
}

function loadedIds(t: ReturnType<typeof setup>): DrawFeatureId[] {
    return t.loadedIntoDraw.flat()
}

describe("WorkingSetLoader: begin", () => {
    test("loads the viewport and the selection when the selection belongs to the source", async () => {
        const t = setup()
        t.getSelectionIds.mockResolvedValue([4, 5])

        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledWith("s1", { type: "bbox", bbox: BBOX }, 10)
        expect(t.fetchWorkingSet).toHaveBeenCalledWith("s1", { type: "ids", ids: [4, 5] }, 10)
        expect(loadedIds(t).sort()).toEqual([1, 4, 5])
        expect(t.selections).toEqual([[4, 5]])
        expect(t.loading.at(-1)).toBe(false)
    })

    test("loads only the viewport when the selection belongs to another source", async () => {
        const t = setup()
        t.getSelectionIds.mockResolvedValue([4, 5])

        t.loader.begin({ selectionSourceId: "s2", bbox: BBOX })
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledExactlyOnceWith("s1", { type: "bbox", bbox: BBOX }, 10)
        // The selection of another source is not draw's: draw starts with none
        expect(t.selections).toEqual([[]])
    })

    test("a selection over the cap loads nothing for that part only", async () => {
        const t = setup()
        t.getSelectionIds.mockResolvedValue([4, 5])
        t.fetchWorkingSet.mockImplementation((_, scope) =>
            Promise.resolve(scope.type === "ids" ? workingSet([], true) : workingSet([1])),
        )

        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()

        expect(loadedIds(t)).toEqual([1])
        expect(t.overCap.at(-1)).toBe("ids")
        expect(t.loading.at(-1)).toBe(false)
    })

    test("a viewport over the cap loads nothing for that part only", async () => {
        const t = setup()
        t.getSelectionIds.mockResolvedValue([4, 5])
        t.fetchWorkingSet.mockImplementation((_, scope) =>
            Promise.resolve(scope.type === "ids" ? workingSet(scope.ids) : workingSet([], true)),
        )

        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()

        expect(loadedIds(t).sort()).toEqual([4, 5])
        expect(t.overCap.at(-1)).toBe("bbox")
    })

    test("a selection larger than the cap is over the cap without a query", async () => {
        const t = setup({ cap: 2 })
        t.getSelectionIds.mockResolvedValue([4, 5, 6])

        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledExactlyOnceWith("s1", { type: "bbox", bbox: BBOX }, 2)
        expect(t.overCap.at(-1)).toBe("ids")
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

    test("a move re-queries the viewport only, also with a selection loaded", async () => {
        const t = setup()
        t.getSelectionIds.mockResolvedValue([4])
        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()

        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledTimes(3)
        expect(t.fetchWorkingSet).toHaveBeenLastCalledWith("s1", { type: "bbox", bbox: OTHER_BBOX }, 10)
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

    // The create landed on the backend before the query, but its id reached the queue only after it
    test("a feature created while the query ran does not load next to its draw copy", async () => {
        const t = setup()
        const createLanded = deferred<FlushResult>()
        t.flush.mockResolvedValueOnce({ ok: true }).mockReturnValueOnce(createLanded.promise)
        t.fetchWorkingSet.mockResolvedValue(workingSet([9, 3]))

        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        expect(t.loadedIntoDraw).toEqual([])

        t.createdIds.mockReturnValue([9])
        createLanded.resolve({ ok: true })
        await flushAsync()

        expect(t.loadedIntoDraw).toEqual([[3]])
        expect(t.loading.at(-1)).toBe(false)
    })

    test("a load is dropped when the session end starts while ops created during the query land", async () => {
        const t = setup()
        const createLanded = deferred<FlushResult>()
        t.flush.mockResolvedValueOnce({ ok: true }).mockReturnValueOnce(createLanded.promise)

        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.loader.setPending(true)
        createLanded.resolve({ ok: true })
        await flushAsync()

        expect(t.loadedIntoDraw).toEqual([])
        expect(t.hidden).toEqual([])
    })

    test("a load is dropped when an op sent during the query failed", async () => {
        const t = setup()
        t.flush.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, error: "boom", dropped: 0 })

        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledOnce()
        expect(t.loadedIntoDraw).toEqual([])
        expect(t.loading.at(-1)).toBe(false)
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

describe("WorkingSetLoader: loaded backend ids", () => {
    test("reports the backend ids loaded into draw after a load", async () => {
        const t = setup()
        t.fetchWorkingSet.mockResolvedValue(workingSet([1, 2]))

        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        expect(t.hidden).toEqual([[1, 2]])
    })

    test("reports the ids again after a move unloads and loads features", async () => {
        const t = setup()
        t.fetchWorkingSet.mockResolvedValue(workingSet([1, 2]))
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.fetchWorkingSet.mockResolvedValue(workingSet([2, 3]))

        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.hidden.at(-1)).toEqual([2, 3])
    })

    test("an edited or deleted feature stays reported after the map moves away from it", async () => {
        const t = setup()
        t.fetchWorkingSet.mockResolvedValue(workingSet([1, 2]))
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.pinned.add(1)
        t.fetchWorkingSet.mockResolvedValue(workingSet([3]))

        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.hidden.at(-1)).toEqual([1, 3])
    })

    test("draw ids of created features are not reported: the base source never has them", async () => {
        const t = setup()
        t.fetchWorkingSet.mockResolvedValue(workingSet([1, "draw-a"]))

        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        expect(t.hidden).toEqual([[1]])
    })

    test("does not report the same ids twice", async () => {
        const t = setup()
        t.fetchWorkingSet.mockResolvedValue(workingSet([1, 2]))
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.fetchWorkingSet.mockResolvedValue(workingSet([2, 1]))

        t.loader.moved(OTHER_BBOX)
        await flushAsync()

        expect(t.hidden).toEqual([[1, 2]])
    })

    test("an over-cap, stale or dropped load reports nothing", async () => {
        const t = setup()
        const first = deferred<WorkingSet>()
        t.fetchWorkingSet.mockReturnValueOnce(first.promise).mockResolvedValueOnce(workingSet([], true))
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.moved(OTHER_BBOX)
        await flushAsync()
        first.resolve(workingSet([1]))
        await flushAsync()

        expect(t.hidden).toEqual([])
    })
})

describe("WorkingSetLoader: selection changes", () => {
    test("loads the selected ids that are not loaded yet", async () => {
        const t = setup()
        t.fetchWorkingSet.mockImplementation((_, scope) =>
            Promise.resolve(workingSet(scope.type === "ids" ? scope.ids : [1, 2])),
        )
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.selectionChanged([2, 3])
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenLastCalledWith("s1", { type: "ids", ids: [3] }, 10)
        expect(t.loadedIntoDraw.at(-1)).toEqual([3])
        expect(t.hidden.at(-1)).toEqual([1, 2, 3])
    })

    test("queries nothing when every selected feature is loaded or edited", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.pinned.add(7)

        t.loader.selectionChanged([1, 7])
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledOnce()
    })

    test("loads nothing for a selection over the cap", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.fetchWorkingSet.mockResolvedValue(workingSet([], true))

        t.loader.selectionChanged([3, 4])
        await flushAsync()

        expect(loadedIds(t)).toEqual([1])
        expect(t.overCap.at(-1)).toBe("ids")
    })

    test("only the latest selection change loads", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        const first = deferred<WorkingSet>()
        t.fetchWorkingSet.mockReturnValueOnce(first.promise)

        t.loader.selectionChanged([3])
        await flushAsync()
        t.loader.selectionChanged([4])
        await flushAsync()
        first.resolve(workingSet([3]))
        await flushAsync()

        expect(loadedIds(t)).toEqual([1, 4])
    })

    test("a selection change does not cancel a viewport load", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        const viewport = deferred<WorkingSet>()
        t.fetchWorkingSet.mockReturnValueOnce(viewport.promise)

        t.loader.moved(OTHER_BBOX)
        await flushAsync()
        t.loader.selectionChanged([3])
        await flushAsync()
        viewport.resolve(workingSet([1, 2]))
        await flushAsync()

        expect(loadedIds(t).sort()).toEqual([1, 2, 3])
        expect(t.loading.at(-1)).toBe(false)
    })

    test("a selection load does not block the map", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        const before = t.loading.length

        t.loader.selectionChanged([3])
        await flushAsync()

        expect(t.loading.length).toBe(before)
    })

    test("no selection load starts while the session end is pending or after dispose", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()

        t.loader.setPending(true)
        t.loader.selectionChanged([3])
        await flushAsync()
        t.loader.setPending(false)
        t.loader.dispose()
        t.loader.selectionChanged([4])
        await flushAsync()

        expect(t.fetchWorkingSet).toHaveBeenCalledOnce()
    })
})

describe("WorkingSetLoader: unloading", () => {
    test("a feature leaves draw only when it is not in the viewport, not selected and not pinned", async () => {
        const t = setup()
        t.getSelectionIds.mockResolvedValue([5])
        t.fetchWorkingSet.mockImplementation((_, scope) =>
            Promise.resolve(workingSet(scope.type === "ids" ? scope.ids : [1, 2, 3])),
        )
        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()
        t.pinned.add(3)

        // 1 and 2 leave the viewport: 1 is unloaded, 3 is pinned, 5 is selected
        t.fetchWorkingSet.mockImplementation((_, scope) =>
            Promise.resolve(workingSet(scope.type === "ids" ? scope.ids : [2])),
        )
        t.loader.moved(OTHER_BBOX)
        await flushAsync()
        expect(t.unloadedFromDraw.at(-1)).toEqual([1])

        // 5 is deselected away from the viewport: it leaves; 2 is in view and 3 pinned: they stay
        t.loader.selectionChanged([])
        await flushAsync()
        expect(t.unloadedFromDraw.at(-1)).toEqual([5])
        expect(t.hidden.at(-1)?.sort()).toEqual([2, 3])
    })

    test("a viewport over the cap keeps what is loaded", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.fetchWorkingSet.mockResolvedValue(workingSet([], true))

        t.loader.moved(OTHER_BBOX)
        await flushAsync()
        t.loader.selectionChanged([])
        await flushAsync()

        expect(t.unloadedFromDraw.flat()).toEqual([])
    })
})

describe("WorkingSetLoader: the over-cap notice", () => {
    test("reports ids while the selection is over the cap, else bbox while the viewport is, else nothing", async () => {
        const t = setup()
        t.getSelectionIds.mockResolvedValue([4, 5])
        t.fetchWorkingSet.mockResolvedValue(workingSet([], true))
        t.loader.begin({ selectionSourceId: "s1", bbox: BBOX })
        await flushAsync()
        expect(t.overCap.at(-1)).toBe("ids")

        t.loader.selectionChanged([])
        await flushAsync()
        expect(t.overCap.at(-1)).toBe("bbox")

        t.fetchWorkingSet.mockResolvedValue(workingSet([1]))
        t.loader.moved(OTHER_BBOX)
        await flushAsync()
        expect(t.overCap.at(-1)).toBeUndefined()
    })
})

describe("WorkingSetLoader: held ids", () => {
    test("holds the loaded and the pinned ids", async () => {
        const t = setup()
        t.loader.begin({ selectionSourceId: undefined, bbox: BBOX })
        await flushAsync()
        t.pinned.add("draw-a")

        expect([...t.loader.held()]).toEqual([1, "draw-a"])
    })
})
