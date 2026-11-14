import type { DrawFeatureId, FlushResult, WorkingSet, WorkingSetScope } from "@/types"
import type { Bbox } from "@/types/bbox"
import { planWorkingSetUpdate } from "./draw-working-set"

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
    // The kind of scope that held too many features to load, or undefined once every part fits
    onOverCap: (scope: WorkingSetScope["type"] | undefined) => void
    onError: (err: unknown) => void
    // The backend ids now loaded into draw (edited and deleted ones included), after a load changed them
    onLoaded: (ids: number[]) => void
    // The selection the session starts with: the backend selection when it belongs to the source, else none
    onSelection: (ids: number[]) => void
}

export type BeginOptions = {
    // The source the frontend selection belongs to when drawing starts
    selectionSourceId: string | undefined
    bbox: Bbox
}

type Part = "viewport" | "selection"

type Ticket = { part: Part; epoch: number; generation: number }

/**
 * Loads a draw session's working set into the draw control. It is the union of
 * two parts and the pinned (edited) features: the viewport, re-queried after
 * every move, and the selection, re-queried after every selection change for
 * the selected features not loaded yet. A part over the cap loads nothing and
 * keeps what it loaded before. A feature leaves draw only when it is in neither
 * part and not pinned, so a load never drops a selected feature.
 *
 * Only the latest load of each part applies. A load is dropped, and its error
 * not reported, once a newer one of its part starts, once the session end is
 * pending (commit or cancel running: the backend session may already be gone),
 * or after `dispose`. No load starts while pending or after dispose.
 */
export class WorkingSetLoader {
    // Bumped when the session end starts and on dispose: drops every running load
    private epoch = 0
    private generations: Record<Part, number> = { viewport: 0, selection: 0 }
    private loading: Record<Part, boolean> = { viewport: false, selection: false }
    private overCap: Record<Part, boolean> = { viewport: false, selection: false }
    private reportedOverCap: WorkingSetScope["type"] | undefined = undefined
    private disposed = false
    private pending = false
    private began = false
    private bbox: Bbox | undefined
    // Ids of the viewport part, as of its last load that fit the cap
    private viewport = new Set<DrawFeatureId>()
    private selected = new Set<number>()
    private loaded = new Set<DrawFeatureId>()
    private reported = new Set<number>()

    constructor(private readonly options: WorkingSetLoaderOptions) {}

    begin({ selectionSourceId, bbox }: BeginOptions): void {
        this.bbox = bbox
        const epoch = this.epoch
        this.options
            .getSelectionIds()
            .then(selectionIds => {
                if (!this.isLive(epoch)) {
                    return
                }
                this.began = true
                this.selected = new Set(selectionSourceId === this.options.sourceId ? selectionIds : [])
                this.options.onSelection([...this.selected])
                this.refreshViewport()
                if (this.selected.size > 0) {
                    this.refreshSelection(true)
                }
            })
            .catch(err => {
                if (!this.isLive(epoch)) {
                    return
                }
                this.options.onError(err)
                this.options.onLoading(false)
            })
    }

    /** The map moved to `bbox`: the viewport part follows it. */
    moved(bbox: Bbox): void {
        this.bbox = bbox
        if (this.began) {
            this.refreshViewport()
        }
    }

    /** The backend selection is now `ids`: the selected features not loaded yet are loaded, if they fit. */
    selectionChanged(ids: number[]): void {
        this.selected = new Set(ids)
        if (this.began) {
            this.refreshSelection(false)
        }
    }

    /** Ids draw may hold: the features loaded from the backend and the pinned ones (created ones included). */
    held(): Set<DrawFeatureId> {
        return new Set([...this.loaded, ...this.options.pinned])
    }

    /** A commit or cancel started (true) or settled without ending the session (false). */
    setPending(pending: boolean): void {
        if (pending && !this.pending) {
            this.invalidate()
            this.loading = { viewport: false, selection: false }
            this.options.onLoading(false)
        }
        this.pending = pending
    }

    dispose(): void {
        this.disposed = true
        this.invalidate()
    }

    private refreshViewport(): void {
        const bbox = this.bbox
        if (bbox === undefined) {
            return
        }
        this.run("viewport", true, ticket => this.loadViewport(bbox, ticket))
    }

    // A selection load blocks the map only at begin, or when it replaces one that did
    private refreshSelection(blocking: boolean): void {
        this.run("selection", blocking || this.loading.selection, ticket => this.loadSelection(ticket))
    }

    private run(part: Part, blocking: boolean, load: (ticket: Ticket) => Promise<void>): void {
        if (this.disposed || this.pending) {
            return
        }
        this.generations[part] += 1
        const ticket: Ticket = { part, epoch: this.epoch, generation: this.generations[part] }
        if (blocking) {
            this.setLoading(part, true)
        }
        load(ticket)
            .catch(err => {
                if (this.isCurrent(ticket)) {
                    this.options.onError(err)
                }
            })
            .finally(() => {
                if (this.isCurrent(ticket) && blocking) {
                    this.setLoading(part, false)
                }
            })
    }

    private async loadViewport(bbox: Bbox, ticket: Ticket): Promise<void> {
        const workingSet = await this.query({ type: "bbox", bbox }, ticket)
        if (workingSet === undefined) {
            return
        }
        this.setOverCap("viewport", workingSet.overCap)
        if (workingSet.overCap) {
            return
        }
        const incoming = workingSet.features.features
        this.viewport = new Set(incoming.flatMap(feature => (feature.id === undefined ? [] : [feature.id])))
        this.update(incoming)
    }

    private async loadSelection(ticket: Ticket): Promise<void> {
        const { cap, queue } = this.options
        // Created features must have their backend ids first, so they are not queried as missing
        const flushed = await queue.flush()
        if (!flushed.ok || !this.isCurrent(ticket)) {
            return
        }
        const pinned = this.pinned()
        const missing = [...this.selected].filter(id => !this.loaded.has(id) && !pinned.has(id))
        if (this.selected.size > cap) {
            this.setOverCap("selection", true)
            this.update([])
            return
        }
        if (missing.length === 0) {
            this.setOverCap("selection", false)
            this.update([])
            return
        }
        const workingSet = await this.query({ type: "ids", ids: missing }, ticket)
        if (workingSet === undefined) {
            return
        }
        this.setOverCap("selection", workingSet.overCap)
        this.update(workingSet.overCap ? [] : workingSet.features.features)
    }

    // Undefined when the load was dropped or the op queue failed (it already reported its error)
    private async query(scope: WorkingSetScope, ticket: Ticket): Promise<WorkingSet | undefined> {
        const { sourceId, cap, queue } = this.options
        // Created features must have their backend ids before the query, or they would load twice
        const flushed = await queue.flush()
        if (!flushed.ok || !this.isCurrent(ticket)) {
            // The backend lags behind the map, so load nothing more
            return undefined
        }
        const workingSet = await this.options.fetchWorkingSet(sourceId, scope, cap)
        if (!this.isCurrent(ticket)) {
            return undefined
        }
        // A create sent while the query ran may be in its result before its backend id reached the
        // queue: wait for it, so `createdIds` knows it and it does not load twice
        const settled = await queue.flush()
        if (!settled.ok || !this.isCurrent(ticket)) {
            return undefined
        }
        return workingSet
    }

    // Loads the incoming features and unloads every untouched one that is in neither part
    private update(incoming: GeoJSON.Feature<GeoJSON.Geometry | null>[]): void {
        const plan = planWorkingSetUpdate({
            loaded: this.loaded,
            pinned: this.pinned(),
            keep: new Set<DrawFeatureId>([...this.viewport, ...this.selected]),
            incoming,
        })
        // Load first: if it throws, nothing was unloaded and `loaded` still matches draw
        this.options.draw.load({ type: "FeatureCollection", features: plan.add })
        this.options.draw.unload(plan.unload)
        this.loaded = plan.loaded
        this.reportLoaded()
    }

    private pinned(): Set<DrawFeatureId> {
        return new Set([...this.options.pinned, ...this.options.queue.createdIds()])
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

    private setLoading(part: Part, loading: boolean): void {
        this.loading[part] = loading
        this.options.onLoading(this.loading.viewport || this.loading.selection)
    }

    // The selection notice wins: it is the one the user can act on by selecting fewer
    private setOverCap(part: Part, overCap: boolean): void {
        this.overCap[part] = overCap
        const scope = overCapScope(this.overCap)
        if (scope !== this.reportedOverCap) {
            this.reportedOverCap = scope
            this.options.onOverCap(scope)
        }
    }

    private invalidate(): void {
        this.epoch += 1
    }

    private isLive(epoch: number): boolean {
        return !this.disposed && !this.pending && epoch === this.epoch
    }

    private isCurrent(ticket: Ticket): boolean {
        return this.isLive(ticket.epoch) && ticket.generation === this.generations[ticket.part]
    }
}

function overCapScope(overCap: Record<Part, boolean>): WorkingSetScope["type"] | undefined {
    if (overCap.selection) {
        return "ids"
    }
    if (overCap.viewport) {
        return "bbox"
    }
    return undefined
}

function sameIds(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
    return a.size === b.size && [...a].every(id => b.has(id))
}
