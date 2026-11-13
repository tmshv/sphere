import logger from "@/logger"
import type { DrawEvent, DrawFeatureId, EditOp, FlushResult, WorkingSet, WorkingSetScope } from "@/types"
import { invoke } from "@tauri-apps/api/core"

const CMD_BEGIN = "draw_begin"
const CMD_GET_WORKING_SET = "draw_get_working_set"
const CMD_APPLY = "draw_apply"
const CMD_COMMIT = "draw_commit"
const CMD_ROLLBACK = "draw_rollback"

const EVENT_CREATE = "draw.create"
const EVENT_UPDATE = "draw.update"
const EVENT_DELETE = "draw.delete"
const EVENT_COMBINE = "draw.combine"
const EVENT_UNCOMBINE = "draw.uncombine"

type RawWorkingSet = { features: string; overCap: boolean }

function isFeatureCollection(value: unknown): value is GeoJSON.FeatureCollection {
    return (
        typeof value === "object" &&
        value !== null &&
        "type" in value &&
        value.type === "FeatureCollection" &&
        "features" in value &&
        Array.isArray(value.features)
    )
}

function featureId(feature: GeoJSON.Feature): DrawFeatureId {
    if (feature.id === undefined) {
        throw new Error("Draw feature has no id")
    }
    return feature.id
}

function createOp(feature: GeoJSON.Feature): EditOp {
    const id = featureId(feature)
    if (typeof id !== "string") {
        throw new Error(`Created draw feature has a non-string id: ${id}`)
    }
    return { type: "create", drawId: id, feature }
}

function updateOp(feature: GeoJSON.Feature): EditOp {
    return { type: "update", id: featureId(feature), feature }
}

function deleteOp(feature: GeoJSON.Feature): EditOp {
    return { type: "delete", id: featureId(feature) }
}

/** Maps a draw event to backend edit ops. Combine/uncombine delete first, then create. */
export function eventToOps(event: DrawEvent): EditOp[] {
    switch (event.type) {
        case EVENT_CREATE:
            return (event.features ?? []).map(createOp)
        case EVENT_UPDATE:
            return (event.features ?? []).map(updateOp)
        case EVENT_DELETE:
            return (event.features ?? []).map(deleteOp)
        case EVENT_COMBINE:
        case EVENT_UNCOMBINE:
            return [...(event.deletedFeatures ?? []).map(deleteOp), ...(event.createdFeatures ?? []).map(createOp)]
        default:
            return []
    }
}

export async function beginDraw(id: string): Promise<void> {
    await invoke(CMD_BEGIN, { id })
}

export async function loadWorkingSet(id: string, scope: WorkingSetScope, cap: number): Promise<WorkingSet> {
    const raw = await invoke<RawWorkingSet>(CMD_GET_WORKING_SET, { id, scope, cap })
    const features: unknown = JSON.parse(raw.features)
    if (!isFeatureCollection(features)) {
        throw new Error("Working set is not a FeatureCollection")
    }
    return { features, overCap: raw.overCap }
}

/** Resolves to the backend id for create/update, null for delete. */
export async function applyOp(id: string, op: EditOp): Promise<number | null> {
    return invoke<number | null>(CMD_APPLY, { id, op })
}

export async function commitDraw(id: string): Promise<number[]> {
    return invoke<number[]>(CMD_COMMIT, { id })
}

export async function rollbackDraw(id: string): Promise<number[]> {
    return invoke<number[]>(CMD_ROLLBACK, { id })
}

function logOpError(err: unknown) {
    logger.error("Draw edit failed: %s", err)
}

/**
 * Applies ops strictly in order through a promise chain. Failure is sticky:
 * the first failed op (or an event that cannot be mapped) reports its error
 * once through `onError` and stops all further sending, because later ops
 * would build on diverged backend state. Ops queued after that, and ops
 * already waiting in the chain, are counted as dropped. `flush()` resolves
 * (never rejects) with the outcome once everything queued so far has settled.
 */
export class DrawOpQueue {
    private tail: Promise<void> = Promise.resolve()
    private failure: { error: unknown } | null = null
    private dropped = 0

    constructor(
        private readonly sourceId: string,
        private readonly onError: (err: unknown) => void = logOpError,
    ) {}

    enqueueEvent(event: DrawEvent): void {
        let ops: EditOp[]
        try {
            ops = eventToOps(event)
        } catch (err) {
            this.fail(err)
            return
        }
        this.enqueue(ops)
    }

    enqueue(ops: EditOp[]): void {
        for (const op of ops) {
            this.tail = this.tail.then(() => this.run(op))
        }
    }

    fail(error: unknown): void {
        if (this.failure) {
            return
        }
        this.failure = { error }
        this.onError(error)
    }

    async flush(): Promise<FlushResult> {
        let seen: Promise<void>
        do {
            seen = this.tail
            await seen
        } while (seen !== this.tail)
        if (this.failure) {
            return { ok: false, error: this.failure.error, dropped: this.dropped }
        }
        return { ok: true }
    }

    private async run(op: EditOp): Promise<void> {
        if (this.failure) {
            this.dropped += 1
            return
        }
        try {
            await applyOp(this.sourceId, op)
        } catch (err) {
            this.fail(err)
        }
    }
}
