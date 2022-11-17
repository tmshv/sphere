import { configureStore } from '@reduxjs/toolkit'
import projection, { projectionSlice } from './projection'
import mapStyle, { mapStyleSlice } from './mapStyle'

export const store = configureStore({
    reducer: {
        projection,
        mapStyle,
    },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export const actions = {
    projection: projectionSlice.actions,
    mapStyle: mapStyleSlice.actions,
}
