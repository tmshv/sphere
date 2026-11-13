import type { DrawFeatureId, FlushResult, WorkingSet, WorkingSetScope } from "@/types"
import type { Bbox } from "@/types/bbox"
import { chooseWorkingSetScope, planWorkingSetUpdate, scopeAfterMove } from "./draw-working-set"

/** The part of the draw control the loader drives. */
export type WorkingSetTarget = {
    load(featureCollection: GeoJSON.FeatureCollection): void
    unload(ids: DrawFeatureId[]): void
}

/** The part of the op queue the loader needs. */
export type WorkingSetQueue = {
    flush(): Promise<FlushResult>
    createdIds(): number[]
}

export type WorkingSetLoaderOptions = {
    sourceId: string
    cap: number
    draw: WorkingSetTarget
    queue: WorkingSetQueue
    // Ids the user edited, deleted or created; read live on every load
    pinned: ReadonlySet<DrawFeatureId>
    fetchWorkingSet: (sourceId: string, scope: WorkingSetScope, cap: number) => Promise<WorkingSet>
    getSelectionIds: () => Promise<number[]>
    onLoading: (loading: boolean) => void
    // The kind of scope that held too many features to load, or undefined once a load fits
    onOverCap: (scope: WorkingSetScope["type"] | undefined) => void
    onError: (err: unknown) => void
    // The backend ids now loaded into draw (edited and deleted ones included), after a load changed them
    onLoaded: (ids: number[]) => void
}

export type BeginOptions = {
    // The source the frontend selection belongs to when drawing starts
    selectionSourceId: string | undefined
    bbox: Bbox
}

/**
 * Loads a draw session's working set into the draw control: the selection
 * when it belongs to the source, else the viewport, re-queried after every
 * move. Only the latest load applies. A load is dropped, and its error not
 * reported, once a newer one starts, once the session end is pending
 * (commit or cancel running: the backend session may already be gone), or
 * after `dispose`. No load starts while pending or after dispose.
 */
export class WorkingSetLoader {
    private generation = 0
    private disposed = false
    private pending = false
    private scope: WorkingSetScope | undefined
    private loaded = new Set<DrawFeatureId>()
    private reported = new Set<number>()

    constructor(private readonly options: WorkingSetLoaderOptions) {}

    begin({ selectionSourceId, bbox }: BeginOptions): void {
        const current = this.generation
        this.options
            .getSelectionIds()
            .then(selectionIds => {
                if (!this.isCurrent(current)) {
                    return
                }
                this.scope = chooseWorkingSetScope({
                    sourceId: this.options.sourceId,
                    selectionSourceId,
                    selectionIds,
                    bbox,
                })
                this.refresh(this.scope)
            })
            .catch(err => {
                if (!this.isCurrent(current)) {
                    return
                }
                this.options.onError(err)
                this.options.onLoading(false)
            })
    }

    /** The map moved to `bbox`: a viewport scope follows it. */
    moved(bbox: Bbox): void {
        const next = scopeAfterMove(this.scope, bbox)
        if (next) {
            this.refresh(next)
        }
    }

    /** A commit or cancel started (true) or settled without ending the session (false). */
    setPending(pending: boolean): void {
        if (pending && !this.pending) {
            this.invalidate()
            this.options.onLoading(false)
        }
        this.pending = pending
    }

    dispose(): void {
        this.disposed = true
        this.invalidate()
    }

    private refresh(scope: WorkingSetScope): void {
        if (this.disposed || this.pending) {
            return
        }
        this.invalidate()
        const current = this.generation
        this.options.onLoading(true)
        this.apply(scope, current)
            .catch(err => {
                if (this.isCurrent(current)) {
                    this.options.onError(err)
                }
            })
            .finally(() => {
                if (this.isCurrent(current)) {
                    this.options.onLoading(false)
                }
            })
    }

    private async apply(scope: WorkingSetScope, current: number): Promise<void> {
        const { sourceId, cap, draw, queue, pinned } = this.options
        // Created features must have their backend ids before the query, or they would load twice
        const flushed = await queue.flush()
        if (!flushed.ok || !this.isCurrent(current)) {
            // A failed queue is already reported; the backend lags behind the map, so load nothing more
            return
        }
        const workingSet = await this.options.fetchWorkingSet(sourceId, scope, cap)
        if (!this.isCurrent(current)) {
            return
        }
        if (workingSet.overCap) {
            this.options.onOverCap(scope.type)
            return
        }
        this.options.onOverCap(undefined)
        const plan = planWorkingSetUpdate({
            loaded: this.loaded,
            pinned: new Set([...pinned, ...queue.createdIds()]),
            incoming: workingSet.features.features,
        })
        // Load first: if it throws, nothing was unloaded and `loaded` still matches draw
        draw.load({ type: "FeatureCollection", features: plan.add })
        draw.unload(plan.unload)
        this.loaded = plan.loaded
        this.reportLoaded()
    }

    // Draw ids (strings) belong to created features, which the base source never has
    private reportLoaded(): void {
        const ids = new Set([...this.loaded].filter(id => typeof id === "number"))
        if (sameIds(ids, this.reported)) {
            return
        }
        this.reported = ids
        this.options.onLoaded([...ids])
    }

    private invalidate(): void {
        this.generation += 1
    }

    private isCurrent(generation: number): boolean {
        return !this.disposed && !this.pending && generation === this.generation
    }
}

function sameIds(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
    return a.size === b.size && [...a].every(id => b.has(id))
}
