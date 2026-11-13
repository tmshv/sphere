import logger from "@/logger"
import type { DrawEvent, DrawFeatureId, EditOp, WorkingSet, WorkingSetScope } from "@/types"
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

function featureId(feature: GeoJSON.Feature): DrawFeatureId {
    if (feature.id === undefined) {
        throw new Error("Draw feature has no id")
    }
    return feature.id
}

function createOp(feature: GeoJSON.Feature): EditOp {
    return { type: "create", drawId: String(featureId(feature)), feature }
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
    return { features: JSON.parse(raw.features), overCap: raw.overCap }
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
    logger.error("Failed to apply draw op: %s", err)
}

/**
 * Applies ops strictly in order through a promise chain. A failed op is passed
 * to `onError` (logged by default) and later ops still run, because the draw
 * map already shows them. `flush()` resolves once everything queued so far
 * (including ops added while waiting) has been applied.
 */
export class DrawOpQueue {
    private tail: Promise<void> = Promise.resolve()

    constructor(
        private readonly sourceId: string,
        private readonly onError: (err: unknown, op: EditOp) => void = logOpError,
    ) {}

    enqueue(ops: EditOp[]): void {
        for (const op of ops) {
            this.tail = this.tail.then(async () => {
                try {
                    await applyOp(this.sourceId, op)
                } catch (err) {
                    this.onError(err, op)
                }
            })
        }
    }

    async flush(): Promise<void> {
        let seen: Promise<void>
        do {
            seen = this.tail
            await seen
        } while (seen !== this.tail)
    }
}
