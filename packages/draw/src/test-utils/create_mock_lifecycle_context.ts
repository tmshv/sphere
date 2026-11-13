import { type Mock, vi } from "vitest"
import type { ModeLifecycle } from "../lib/mode_handler"
import type { FeatureId } from "../types"

/** The `this` of a mode's `start`, made of mocks. */
export interface MockLifecycleContext extends ModeLifecycle {
    on: Mock<ModeLifecycle["on"]>
    render: Mock<(id: FeatureId) => void>
}

export default function createMockLifecycleContext(): MockLifecycleContext {
    return {
        on: vi.fn(),
        render: vi.fn(),
    }
}
