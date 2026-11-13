import type { FeatureId } from "../types"

/**
 * An insertion-ordered set of string and number ids. `"1"` and `1` are
 * distinct members.
 */
class StringSet {
    #items = new Set<FeatureId>()

    constructor(items?: readonly FeatureId[]) {
        for (const item of items ?? []) {
            // Plain JavaScript callers can pass holes
            if (item !== undefined) this.add(item)
        }
    }

    add(x: FeatureId): this {
        this.#items.add(x)
        return this
    }

    delete(x: FeatureId): this {
        this.#items.delete(x)
        return this
    }

    has(x: unknown): boolean {
        if (typeof x !== "string" && typeof x !== "number") return false
        return this.#items.has(x)
    }

    values(): FeatureId[] {
        return Array.from(this.#items)
    }

    clear(): this {
        this.#items.clear()
        return this
    }
}

export default StringSet
