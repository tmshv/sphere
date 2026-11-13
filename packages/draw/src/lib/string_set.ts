import type { FeatureId } from "../types"

/**
 * An insertion-ordered set of string and number ids. `"1"` and `1` are
 * distinct members.
 */
class StringSet {
    #items: Record<string, number> = {}
    #nums: Record<string, number> = {}
    #length = 0

    constructor(items?: readonly FeatureId[]) {
        this.#length = items ? items.length : 0
        if (!items) return
        for (const [i, item] of items.entries()) {
            this.add(item)
            if (item === undefined) continue
            if (typeof item === "string") this.#items[item] = i
            else this.#nums[item] = i
        }
    }

    add(x: FeatureId): this {
        if (this.has(x)) return this
        this.#length++
        if (typeof x === "string") this.#items[x] = this.#length
        else this.#nums[x] = this.#length
        return this
    }

    delete(x: FeatureId): this {
        if (this.has(x) === false) return this
        this.#length--
        delete this.#items[x]
        delete this.#nums[x]
        return this
    }

    has(x: unknown): boolean {
        if (typeof x !== "string" && typeof x !== "number") return false
        return this.#items[x] !== undefined || this.#nums[x] !== undefined
    }

    values(): FeatureId[] {
        const values: { k: FeatureId; v: number }[] = []
        for (const k of Object.keys(this.#items)) {
            values.push({ k, v: this.#items[k] })
        }
        for (const k of Object.keys(this.#nums)) {
            values.push({ k: Number(k), v: this.#nums[k] })
        }

        return values.sort((a, b) => a.v - b.v).map(a => a.k)
    }

    clear(): this {
        this.#length = 0
        this.#items = {}
        this.#nums = {}
        return this
    }
}

export default StringSet
