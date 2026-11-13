import { vi } from "vitest"

/**
 * Returns a mock ctx object with just those properties a Feature requires.
 */
export default function createMockFeatureContext(opts = { userProperties: false }) {
    return {
        options: {
            userProperties: opts.userProperties,
        },
        store: {
            featureChanged: vi.fn(),
        },
    }
}
