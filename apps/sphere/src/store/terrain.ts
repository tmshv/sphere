import {
    HILLSHADE_DEFAULTS,
    TERRAIN_EXAGGERATION,
    demEncodingOf,
    hillshadeDemSourceId,
    hillshadePaint,
    terrainDemSourceId,
} from "@/lib/terrain"
import type { Id } from "@/types"
import type { HillshadeSettings, TerrainCandidate } from "@/types/terrain"
import type { SelectOption } from "@sphere/ui"
import type { PayloadAction } from "@reduxjs/toolkit"
import { createSelector, createSlice } from "@reduxjs/toolkit"
import type { TerrainSpecification } from "maplibre-gl"
import type { RootState } from "."
import { drawSlice as draw } from "./draw"

type TerrainState = {
    show: boolean
    hillshade: boolean
    exaggeration: number
    sourceId?: Id
    hillshadeSettings: HillshadeSettings
}

const initialState: TerrainState = {
    show: false,
    hillshade: false,
    exaggeration: TERRAIN_EXAGGERATION.default,
    hillshadeSettings: HILLSHADE_DEFAULTS,
}

export const terrainSlice = createSlice({
    name: "terrain",
    initialState,
    reducers: {
        hide: state => {
            state.show = false
        },
        show: state => {
            state.show = true
        },
        toggle: state => {
            state.show = !state.show
        },
        setExaggeration: (state, action: PayloadAction<number>) => {
            state.exaggeration = action.payload
        },
        setHillshade: (state, action: PayloadAction<boolean>) => {
            state.hillshade = action.payload
        },
        updateHillshade: (state, action: PayloadAction<Partial<HillshadeSettings>>) => {
            state.hillshadeSettings = { ...state.hillshadeSettings, ...action.payload }
        },
        pick: (state, action: PayloadAction<Id>) => {
            state.sourceId = action.payload
            state.show = true
        },
        setSource: (state, action: PayloadAction<Id | undefined>) => {
            state.sourceId = action.payload
        },
        enableFor: (state, action: PayloadAction<Id>) => {
            state.sourceId = action.payload
            state.show = true
            state.hillshade = true
        },
    },
})

export const selectIsShowTerrain = (state: RootState) => state.terrain.show
export const selectIsShowHillshade = (state: RootState) => state.terrain.hillshade
export const selectTerrainExaggeration = (state: RootState) => state.terrain.exaggeration
export const selectHillshadeSettings = (state: RootState) => state.terrain.hillshadeSettings
const selectStoredTerrainSourceId = (state: RootState) => state.terrain.sourceId

// Every elevation source, whatever its visibility in the Sources tree, oldest first
export const selectTerrainCandidates = createSelector(
    [(state: RootState) => state.source.allIds, (state: RootState) => state.source.items],
    (allIds, items): TerrainCandidate[] =>
        allIds.flatMap(id => {
            const source = items[id]
            const encoding = demEncodingOf(source)
            return source && encoding ? [{ id, name: source.name, encoding }] : []
        }),
)

export const selectTerrainSourceOptions = createSelector([selectTerrainCandidates], (candidates): SelectOption[] =>
    candidates.map(({ id, name }) => ({ value: id, label: name })),
)

export const selectHasTerrainSource = (state: RootState) => selectTerrainCandidates(state).length > 0

export const selectTerrainSource = createSelector(
    [selectTerrainCandidates, selectStoredTerrainSourceId],
    (candidates, sourceId): TerrainCandidate | null =>
        candidates.find(candidate => candidate.id === sourceId) ?? candidates.at(-1) ?? null,
)

// Memoized: MapBody reads it on every dispatch, and a fresh object would re-render the map and resubscribe useTerrain
export const selectTerrainSpecification = createSelector(
    [selectIsShowTerrain, draw.selectors.isDrawing, selectTerrainSource, selectTerrainExaggeration],
    (show, drawing, source, exaggeration): TerrainSpecification | null => {
        if (!show || drawing || !source) {
            return null
        }
        return { source: terrainDemSourceId(source.id), exaggeration }
    },
)

// Turning terrain off removes the hillshade too, but keeps the hillshade switch, so turning terrain back on restores
// it. Draw mode is not turning terrain off: it flattens the terrain and keeps the hillshade.
export function selectHillshadeSourceId(state: RootState): string | null {
    const source = selectTerrainSource(state)
    if (!state.terrain.show || !state.terrain.hillshade || !source) {
        return null
    }
    return hillshadeDemSourceId(source.id)
}

// Memoized: TerrainSources passes it to the hillshade <Layer>, and a fresh object would re-apply every paint property
export const selectHillshadePaint = createSelector([selectHillshadeSettings], hillshadePaint)

export default terrainSlice.reducer
