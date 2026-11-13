import { type Mock, vi } from "vitest"
import type { ModeHandlerContext } from "../lib/mode_handler"
import type { FeatureId } from "../types"

/** A mode handler context made of mocks. */
export interface MockModeHandlerContext extends ModeHandlerContext {
    readonly store: {
        featureChanged: Mock<(id: FeatureId) => void>
        render: Mock<() => void>
    }
    readonly ui: {
        updateMapClasses: Mock<() => void>
    }
}

export default function createMockModeHandlerContext(): MockModeHandlerContext {
    return {
        store: {
            featureChanged: vi.fn(),
            render: vi.fn(),
        },
        ui: {
            updateMapClasses: vi.fn(),
        },
    }
}
