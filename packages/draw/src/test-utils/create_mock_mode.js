import { vi } from "vitest"

export default function createMockMode() {
    return {
        start: vi.fn(),
        stop: vi.fn(),
        trash: vi.fn(),
        render: vi.fn(),
    }
}
