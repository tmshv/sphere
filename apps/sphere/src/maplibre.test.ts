import { beforeEach, describe, expect, it, vi } from "vitest"

const addProtocol = vi.fn()
const setWorkerUrl = vi.fn()

vi.mock("maplibre-gl", () => ({
    addProtocol: (...args: unknown[]) => addProtocol(...args),
    setWorkerUrl: (...args: unknown[]) => setWorkerUrl(...args),
}))

vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url", () => ({
    default: "/assets/maplibre-gl-worker.mjs",
}))

vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}))
vi.mock("@hyvilo/maplibre-gl-draw/dist/maplibre-gl-draw.css", () => ({}))

const { setupMaplibre } = await import("@/maplibre")

describe("setupMaplibre", () => {
    beforeEach(() => {
        addProtocol.mockClear()
        setWorkerUrl.mockClear()
    })

    it("registers the bundled worker url", () => {
        setupMaplibre()

        expect(setWorkerUrl).toHaveBeenCalledWith("/assets/maplibre-gl-worker.mjs")
    })

    it("registers the mapbox and sphere protocols", () => {
        setupMaplibre()

        const names = addProtocol.mock.calls.map(([name]) => name)
        expect(names).toEqual(["mapbox", "sphere"])
    })

    it("registers a handler function for each protocol", () => {
        setupMaplibre()

        for (const [, handler] of addProtocol.mock.calls) {
            expect(typeof handler).toBe("function")
        }
    })
})
