import { vi } from "vitest"

export default function createMockDrawModeContext() {
    const store = {}

    const api = {
        store: {
            add(f) {
                store[f.id] = f
            },
            delete(id) {
                delete store[id]
            },
            featureChanged: vi.fn(),
            clearSelected: vi.fn(),
            getAllIds() {
                return Object.keys(store)
            },
            get(id) {
                return store[id]
            },
        },
        events: {
            changeMode: vi.fn(),
            actionable: vi.fn(),
        },
        ui: {
            queueMapClasses: vi.fn(),
            setActiveButton: vi.fn(),
        },
        map: {
            doubleClickZoom: {
                disable: vi.fn(),
                enable: vi.fn(),
            },
            fire: vi.fn(),
        },
        _test: {},
    }

    vi.spyOn(api.store, "add")
    vi.spyOn(api.store, "delete")
    vi.spyOn(api.store, "get")

    return api
}
