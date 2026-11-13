import { type Mock, vi } from "vitest"
import type { ModeLifecycle, ModeRuntime, RenderPush } from "../lib/mode_handler"
import type { DrawRenderFeature } from "../types"

/** A mode runtime made of mocks. `stop` and `trash` are optional, so a test can delete them. */
export interface MockMode extends ModeRuntime {
    start: Mock<(this: ModeLifecycle) => void>
    stop?: Mock<() => void>
    trash?: Mock<() => void>
    render: Mock<(geojson: DrawRenderFeature, push: RenderPush) => void>
}

export default function createMockMode(): MockMode {
    return {
        start: vi.fn(),
        stop: vi.fn(),
        trash: vi.fn(),
        render: vi.fn(),
    }
}
