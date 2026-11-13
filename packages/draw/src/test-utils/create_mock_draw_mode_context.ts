import { type Mock, vi } from "vitest"
import type { DrawFeature } from "../feature_types/draw_feature"
import type { ModeContext } from "../modes/mode_interface"
import type { DeleteOptions, DrawActionableState, FeatureId, MapClasses } from "../types"

/** The members the mock draw mode context really has; the mocks keep their mock types. */
export interface MockDrawModeContextMembers {
    store: {
        add: Mock<(feature: DrawFeature) => void>
        delete: Mock<(id: FeatureId | readonly FeatureId[], options?: DeleteOptions) => void>
        featureChanged: Mock<(id: FeatureId) => void>
        clearSelected: Mock<() => void>
        getAllIds(): string[]
        get: Mock<(id: FeatureId) => DrawFeature | undefined>
    }
    events: {
        changeMode: Mock<ModeContext["events"]["changeMode"]>
        actionable: Mock<(actions: DrawActionableState) => void>
    }
    ui: {
        queueMapClasses: Mock<(classes: MapClasses) => void>
        setActiveButton: Mock<(id?: string) => void>
    }
    map: {
        doubleClickZoom: {
            disable: Mock<() => void>
            enable: Mock<() => void>
        }
        fire: Mock<(type: string, properties?: object) => void>
    }
    _test: Record<string, unknown>
}

/**
 * A mock draw mode context, typed as a full `ModeContext` so it can be passed
 * to modes and feature classes. Only the members of
 * `MockDrawModeContextMembers` exist; the rest (`options`, most of the store
 * and the map) are missing at run time.
 */
export type MockDrawModeContext = MockDrawModeContextMembers & ModeContext

export default function createMockDrawModeContext(): MockDrawModeContext {
    const store: Record<string, DrawFeature> = {}

    const api: MockDrawModeContextMembers = {
        store: {
            add: vi.fn(f => {
                store[f.id] = f
            }),
            delete: vi.fn(id => {
                delete store[String(id)]
            }),
            featureChanged: vi.fn(),
            clearSelected: vi.fn(),
            getAllIds() {
                return Object.keys(store)
            },
            get: vi.fn(id => (Object.hasOwn(store, id) ? store[id] : undefined)),
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

    // Modes and features only call the members above; the mock skips the rest of the context
    return api as MockDrawModeContext
}
