import { createAction } from "@reduxjs/toolkit"

type Point = { x: number; y: number }

export type RectSelectModifier = "none" | "shift" | "ctrl"

export const rectSelectDrag = createAction<{
    start: Point
    current: Point
    modifier: RectSelectModifier
}>("rectSelect/drag")

export const rectSelectCommit = createAction<{
    start: Point
    current: Point
    modifier: RectSelectModifier
}>("rectSelect/commit")

export const rectSelectClick = createAction<{
    point: Point
    modifier: RectSelectModifier
}>("rectSelect/click")
