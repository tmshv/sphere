import { vi } from "vitest"

export default function createMockModeHandlerContext() {
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
