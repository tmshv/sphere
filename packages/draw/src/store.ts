import type { Map as MapLibreMap } from "maplibre-gl"
import type { Position } from "geojson"
import toDenseArray from "./lib/to_dense_array"
import StringSet from "./lib/string_set"
import render, { type PendingEmits } from "./render"
import { interactions } from "./constants"
import type { DrawFeature } from "./feature_types/draw_feature"
import type { RenderPush } from "./lib/mode_handler"
import type { DeleteOptions, DrawRenderFeature, FeatureId, Interaction, MapClasses, SelectedCoordinate } from "./types"

/** What the store and its render need from the Draw context. */
export interface StoreContext {
    /** `false` once Draw is removed from the map; a bare test context leaves it out. */
    readonly attached?: boolean
    readonly map: MapLibreMap
    readonly events: {
        currentModeName(): string | null
        currentModeRender(geojson: DrawRenderFeature, push: RenderPush): void
    }
    readonly ui: {
        queueMapClasses(classes: MapClasses): void
    }
}

type FeatureIds = FeatureId | readonly FeatureId[] | undefined

export default class Store {
    #features: Record<string, DrawFeature> = {}
    #featureIds = new StringSet()
    #selectedFeatureIds = new StringSet()
    #selectedCoordinates: SelectedCoordinate[] = []
    #changedFeatureIds = new StringSet()
    #pending: PendingEmits = {
        selectionChange: false,
        deletedFeatures: [],
    }
    #mapInitialConfig: Partial<Record<Interaction, boolean>> = {}
    ctx: StoreContext
    sources: { hot: DrawRenderFeature[]; cold: DrawRenderFeature[] }
    render: () => void
    isDirty: boolean

    constructor(ctx: StoreContext) {
        this.ctx = ctx
        this.sources = {
            hot: [],
            cold: [],
        }

        // Deduplicate requests to render and tie them to animation frames.
        let renderRequest: number | null = null
        this.render = () => {
            if (!renderRequest) {
                renderRequest = requestAnimationFrame(() => {
                    renderRequest = null
                    render(this, this.#pending)
                })
            }
        }
        this.isDirty = false
    }

    /**
     * Delays all rendering until the returned function is invoked
     * @return renderBatch
     */
    createRenderBatch(): () => void {
        const holdRender = this.render
        let numRenders = 0
        this.render = () => {
            numRenders++
        }

        return () => {
            this.render = holdRender
            if (numRenders > 0) {
                this.render()
            }
        }
    }

    /**
     * Sets the store's state to dirty.
     */
    setDirty(): this {
        this.isDirty = true
        return this
    }

    /**
     * Sets a feature's state to changed.
     */
    featureChanged(featureId: FeatureId): this {
        this.#changedFeatureIds.add(featureId)
        return this
    }

    /**
     * Gets the ids of all features currently in changed state.
     */
    getChangedIds(): FeatureId[] {
        return this.#changedFeatureIds.values()
    }

    /**
     * Sets all features to unchanged state.
     */
    clearChangedIds(): this {
        this.#changedFeatureIds.clear()
        return this
    }

    /**
     * Gets the ids of all features in the store.
     */
    getAllIds(): FeatureId[] {
        return this.#featureIds.values()
    }

    /**
     * Adds a feature to the store.
     */
    add(feature: DrawFeature): this {
        this.featureChanged(feature.id)
        this.#features[feature.id] = feature
        this.#featureIds.add(feature.id)
        return this
    }

    /**
     * Deletes a feature or array of features from the store.
     * Cleans up after the deletion by deselecting the features.
     * If changes were made, sets the state to the dirty
     * and fires an event.
     * @param featureIds
     * @param [options]
     * @param [options.silent] - If `true`, this invocation will not fire an event.
     */
    delete(featureIds: FeatureIds, options: DeleteOptions = {}): this {
        for (const id of toDenseArray(featureIds)) {
            if (!this.#featureIds.has(id)) continue
            this.#featureIds.delete(id)
            this.#selectedFeatureIds.delete(id)
            const feature = this.#features[id]
            if (!options.silent) {
                if (this.#pending.deletedFeatures.indexOf(feature) === -1) {
                    this.#pending.deletedFeatures.push(feature)
                }
            }
            delete this.#features[id]
            this.isDirty = true
        }
        this.#refreshSelectedCoordinates(options)
        return this
    }

    /**
     * Returns a feature in the store matching the specified value.
     */
    get(id: FeatureId): DrawFeature | undefined {
        return this.#features[id]
    }

    /**
     * Returns all features in the store.
     */
    getAll(): DrawFeature[] {
        return Object.keys(this.#features).map(id => this.#features[id])
    }

    /**
     * Adds features to the current selection.
     * @param featureIds
     * @param [options]
     * @param [options.silent] - If `true`, this invocation will not fire an event.
     */
    select(featureIds: FeatureIds, options: DeleteOptions = {}): this {
        for (const id of toDenseArray(featureIds)) {
            if (this.#selectedFeatureIds.has(id)) continue
            this.#selectedFeatureIds.add(id)
            this.#changedFeatureIds.add(id)
            if (!options.silent) {
                this.#pending.selectionChange = true
            }
        }
        return this
    }

    /**
     * Deletes features from the current selection.
     * @param featureIds
     * @param [options]
     * @param [options.silent] - If `true`, this invocation will not fire an event.
     */
    deselect(featureIds: FeatureIds, options: DeleteOptions = {}): this {
        for (const id of toDenseArray(featureIds)) {
            if (!this.#selectedFeatureIds.has(id)) continue
            this.#selectedFeatureIds.delete(id)
            this.#changedFeatureIds.add(id)
            if (!options.silent) {
                this.#pending.selectionChange = true
            }
        }
        this.#refreshSelectedCoordinates(options)
        return this
    }

    /**
     * Clears the current selection.
     * @param [options]
     * @param [options.silent] - If `true`, this invocation will not fire an event.
     */
    clearSelected(options: DeleteOptions = {}): this {
        this.deselect(this.#selectedFeatureIds.values(), { silent: options.silent })
        return this
    }

    /**
     * Sets the store's selection, clearing any prior values.
     * If no feature ids are passed, the store is just cleared.
     * @param featureIds
     * @param [options]
     * @param [options.silent] - If `true`, this invocation will not fire an event.
     */
    setSelected(featureIds: FeatureIds, options: DeleteOptions = {}): this {
        const ids = toDenseArray(featureIds)

        // Deselect any features not in the new selection
        this.deselect(
            this.#selectedFeatureIds.values().filter(id => ids.indexOf(id) === -1),
            { silent: options.silent },
        )

        // Select any features in the new selection that were not already selected
        this.select(
            ids.filter(id => !this.#selectedFeatureIds.has(id)),
            { silent: options.silent },
        )

        return this
    }

    /**
     * Sets the store's coordinates selection, clearing any prior values.
     */
    setSelectedCoordinates(coordinates: SelectedCoordinate[]): this {
        this.#selectedCoordinates = coordinates
        this.#pending.selectionChange = true
        return this
    }

    /**
     * Clears the current coordinates selection.
     */
    clearSelectedCoordinates(): this {
        this.#selectedCoordinates = []
        this.#pending.selectionChange = true
        return this
    }

    /**
     * Returns the ids of features in the current selection.
     * @return Selected feature ids.
     */
    getSelectedIds(): FeatureId[] {
        return this.#selectedFeatureIds.values()
    }

    /**
     * Returns features in the current selection. An id selected without a
     * feature in the store (`Draw.changeMode` does not check the ids it is
     * given) yields `undefined`.
     * @return Selected features.
     */
    getSelected(): (DrawFeature | undefined)[] {
        return this.#selectedFeatureIds.values().map(id => this.get(id))
    }

    /**
     * Returns selected coordinates in the currently selected feature.
     * @return Selected coordinates.
     */
    getSelectedCoordinates(): { coordinates: Position }[] {
        const selected = this.#selectedCoordinates.map(coordinate => {
            const feature = this.#require(coordinate.feature_id)
            return {
                coordinates: feature.getCoordinate(coordinate.coord_path),
            }
        })
        return selected
    }

    /**
     * Indicates whether a feature is selected.
     * @return `true` if the feature is selected, `false` if not.
     */
    isSelected(featureId: FeatureId): boolean {
        return this.#selectedFeatureIds.has(featureId)
    }

    /**
     * Sets a property on the given feature
     */
    setFeatureProperty(featureId: FeatureId, property: string, value: unknown): void {
        this.#require(featureId).setProperty(property, value)
        this.featureChanged(featureId)
    }

    #require(id: FeatureId): DrawFeature {
        const feature = this.get(id)
        if (feature === undefined) throw new TypeError(`Draw has no feature ${id}`)
        return feature
    }

    #refreshSelectedCoordinates(options: DeleteOptions): void {
        const newSelectedCoordinates = this.#selectedCoordinates.filter(point =>
            this.#selectedFeatureIds.has(point.feature_id),
        )
        if (this.#selectedCoordinates.length !== newSelectedCoordinates.length && !options.silent) {
            this.#pending.selectionChange = true
        }
        this.#selectedCoordinates = newSelectedCoordinates
    }

    /**
     * Stores the initial config for a map, so that we can set it again after we're done.
     */
    storeMapConfig(): void {
        for (const interaction of interactions) {
            const interactionSet = this.ctx.map[interaction]
            if (interactionSet) {
                this.#mapInitialConfig[interaction] = interactionSet.isEnabled()
            }
        }
    }

    /**
     * Restores the initial config for a map, ensuring all is well.
     */
    restoreMapConfig(): void {
        for (const interaction of interactions) {
            const value = this.#mapInitialConfig[interaction]
            if (value === undefined) continue
            if (value) {
                this.ctx.map[interaction].enable()
            } else {
                this.ctx.map[interaction].disable()
            }
        }
    }

    /**
     * Returns the initial state of an interaction setting.
     * @return `true` if the interaction is enabled, `false` if not.
     * Defaults to `true`. (Todo: include defaults.)
     */
    getInitialConfigValue(interaction: Interaction): boolean {
        const value = this.#mapInitialConfig[interaction]
        if (value !== undefined) {
            return value
        } else {
            // This needs to be set to whatever the default is for that interaction
            // It seems to be true for all cases currently, so let's send back `true`.
            return true
        }
    }
}
