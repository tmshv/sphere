import { demEncodingOf, hillshadeDemSourceId, terrainDemSourceId } from "@/lib/terrain"
import type { Id } from "@/types"
import type { TerrainCandidate } from "@/types/terrain"
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
}

const initialState: TerrainState = {
    show: false,
    hillshade: false,
    exaggeration: 1.5,
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

export const selectHasTerrainSource = (state: RootState) => selectTerrainCandidates(state).length > 0

export const selectTerrainSource = createSelector(
    [selectTerrainCandidates, selectStoredTerrainSourceId],
    (candidates, sourceId): TerrainCandidate | null =>
        candidates.find(candidate => candidate.id === sourceId) ?? candidates.at(-1) ?? null,
)

export function selectTerrainSpecification(state: RootState): TerrainSpecification | null {
    const source = selectTerrainSource(state)
    if (!state.terrain.show || draw.selectors.isDrawing(state) || !source) {
        return null
    }
    return {
        source: terrainDemSourceId(source.id),
        exaggeration: state.terrain.exaggeration,
    }
}

export function selectHillshadeSourceId(state: RootState): string | null {
    const source = selectTerrainSource(state)
    if (!state.terrain.hillshade || !source) {
        return null
    }
    return hillshadeDemSourceId(source.id)
}

export default terrainSlice.reducer
