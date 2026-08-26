import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { copySelection } from "./selection"
import { setupKeyboard } from "./keyboard"

function makeStore(overrides: { sourceId?: string; count?: number; wrapFc?: boolean; mapTool?: string }) {
    return {
        getState: () => ({
            app: { mapTool: overrides.mapTool ?? "pan" },
            selection: {
                sourceId: overrides.sourceId,
                count: overrides.count ?? 0,
                version: 0,
            },
            settings: {
                copyWrapAsFeatureCollection: overrides.wrapFc ?? true,
                copyWktSeparator: "\n",
            },
        }),
        dispatch: vi.fn(),
    }
}

function fireKeydown(key: string, opts: Partial<KeyboardEventInit> = {}) {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, ...opts })
    window.dispatchEvent(event)
    return event
}

let listeners: Array<(e: Event) => void> = []
const originalAddEventListener = window.addEventListener.bind(window)
const originalRemoveEventListener = window.removeEventListener.bind(window)

beforeEach(() => {
    vi.clearAllMocks()
    window.addEventListener = vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "keydown") {
            listeners.push(listener as (e: Event) => void)
        }
        originalAddEventListener(type, listener)
    }) as typeof window.addEventListener
})

afterEach(() => {
    for (const listener of listeners) {
        originalRemoveEventListener("keydown", listener)
    }
    listeners = []
    window.addEventListener = originalAddEventListener
})

function setup(overrides: Parameters<typeof makeStore>[0]) {
    const store = makeStore(overrides)
    setupKeyboard(store as never)
    return store
}

describe("cmd+c keyboard handler", () => {
    test("copies selection as GeoJSON when cmd+c pressed with active selection", () => {
        const store = setup({ sourceId: "s1", count: 3, wrapFc: true })

        fireKeydown("c", { metaKey: true })

        expect(store.dispatch).toHaveBeenCalledWith(copySelection("geojson"))
    })

    test("works with ctrl+c", () => {
        const store = setup({ sourceId: "s1", count: 2 })

        fireKeydown("c", { ctrlKey: true })

        expect(store.dispatch).toHaveBeenCalledWith(copySelection("geojson"))
    })

    test("skips when selection count is 0", () => {
        const store = setup({ sourceId: "s1", count: 0 })

        fireKeydown("c", { metaKey: true })

        expect(store.dispatch).not.toHaveBeenCalled()
    })

    test("skips when sourceId is undefined", () => {
        const store = setup({ sourceId: undefined, count: 5 })

        fireKeydown("c", { metaKey: true })

        expect(store.dispatch).not.toHaveBeenCalled()
    })

    test("skips when active element is an input", () => {
        const store = setup({ sourceId: "s1", count: 1 })

        const input = document.createElement("input")
        document.body.appendChild(input)
        input.focus()

        fireKeydown("c", { metaKey: true })

        expect(store.dispatch).not.toHaveBeenCalled()
        document.body.removeChild(input)
    })

    test("skips when active element is a textarea", () => {
        const store = setup({ sourceId: "s1", count: 1 })

        const textarea = document.createElement("textarea")
        document.body.appendChild(textarea)
        textarea.focus()

        fireKeydown("c", { metaKey: true })

        expect(store.dispatch).not.toHaveBeenCalled()
        document.body.removeChild(textarea)
    })

    test("skips when active element is contentEditable", () => {
        const store = setup({ sourceId: "s1", count: 1 })

        const div = document.createElement("div")
        div.contentEditable = "true"
        document.body.appendChild(div)
        div.focus()

        fireKeydown("c", { metaKey: true })

        expect(store.dispatch).not.toHaveBeenCalled()
        document.body.removeChild(div)
    })

    test("skips when shift is held", () => {
        const store = setup({ sourceId: "s1", count: 1 })

        fireKeydown("c", { metaKey: true, shiftKey: true })

        expect(store.dispatch).not.toHaveBeenCalled()
    })

    test("skips when alt is held", () => {
        const store = setup({ sourceId: "s1", count: 1 })

        fireKeydown("c", { metaKey: true, altKey: true })

        expect(store.dispatch).not.toHaveBeenCalled()
    })
})
