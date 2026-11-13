import { vi } from "vitest"

export default function createMockLifecycleContext() {
    return {
        on: vi.fn(),
    }
}
