import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."

// Define a type for the slice state
type ErrorState = {
    message?: string
}

// Define the initial state using that type
const initialState: ErrorState = {
}

export const errorSlice = createSlice({
    name: "error",
    initialState,
    reducers: {
        clear: state => {
            state.message = undefined
        },
        setError: (state, action: PayloadAction<string>) => {
            state.message = action.payload
        },
    },
})

export const actions = {
    ...errorSlice.actions,
}

export const selectErrorMessage = (state: RootState) => state.error.message

export default errorSlice.reducer
