import { type Mock, vi } from "vitest"
import type { FeatureContext } from "../feature_types/feature"
import type { FeatureId } from "../types"

/** A feature context whose `store.featureChanged` is a mock. */
export interface MockFeatureContext extends FeatureContext {
    readonly options: { readonly userProperties: boolean }
    readonly store: { featureChanged: Mock<(featureId: FeatureId) => void> }
}

/**
 * Returns a mock ctx object with just those properties a Feature requires.
 */
export default function createMockFeatureContext(opts = { userProperties: false }): MockFeatureContext {
    return {
        options: {
            userProperties: opts.userProperties,
        },
        store: {
            featureChanged: vi.fn(),
        },
    }
}
