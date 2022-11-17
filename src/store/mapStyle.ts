import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '.'
import { Style } from 'mapbox-gl'
// import type { RootState } from '../../app/store'

const VECTOR = "mapbox://styles/mapbox/streets-v9"
const SATELLITE = "mapbox://styles/mapbox/satellite-streets-v11"

type MapStyle = string | Style

// Define a type for the slice state
type MapStyleState = {
    value: MapStyle
}

// Define the initial state using that type
const initialState: MapStyleState = {
    value: SATELLITE,
}

export const mapStyleSlice = createSlice({
    name: 'mapStyle',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setVector: state => {
            state.value = VECTOR
        },
        setSatellite: state => {
            state.value = SATELLITE
        },
        // Use the PayloadAction type to declare the contents of `action.payload`
        setMapStyle: (state, action: PayloadAction<MapStyle>) => {
            state.value = action.payload as any
        },
    },
})

// Other code such as selectors can use the imported `RootState` type
export const selectMapStyle = (state: RootState) => state.mapStyle.value

export default mapStyleSlice.reducer
