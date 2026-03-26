import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { appSlice } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect, useRef, useState } from "react"
import type { MapRef } from "react-map-gl/maplibre"

type Point = { x: number; y: number }

const RECT_FILL_OPACITY = 0.1
const THROTTLE_MS = 50

export type RectSelectOverlayProps = {
    mapRef: MapRef | undefined
}

export default function RectSelectOverlay({ mapRef }: RectSelectOverlayProps) {
    const dispatch = useAppDispatch()
    const mapTool = useAppSelector(selectMapTool)
    const sourceId = useAppSelector(selectors.source.selectSelectedId)
    const isDark = useAppSelector(appSlice.selectors.isDark)

    const [dragStart, setDragStart] = useState<Point | null>(null)
    const [dragCurrent, setDragCurrent] = useState<Point | null>(null)
    const lastThrottle = useRef(0)
    const queryGeneration = useRef(0)

    const queryAndSelect = useCallback(
        async (start: Point, current: Point, source: string) => {
            const generation = ++queryGeneration.current
            const map = mapRef?.getMap()
            if (!map) {
                return
            }
            const containerRect = map.getContainer().getBoundingClientRect()
            const mode = current.x >= start.x ? "include" : "intersect"
            const sw = map.unproject([
                Math.min(start.x, current.x) - containerRect.left,
                Math.max(start.y, current.y) - containerRect.top,
            ])
            const ne = map.unproject([
                Math.max(start.x, current.x) - containerRect.left,
                Math.min(start.y, current.y) - containerRect.top,
            ])
            const bbox: [number, number, number, number] = [sw.lng, sw.lat, ne.lng, ne.lat]
            const featureIds = await invoke<number[]>("source_query_rect", {
                id: source,
                bbox,
                mode,
            })
            if (generation !== queryGeneration.current) {
                return
            }
            dispatch(actions.selection.selectMany({ sourceId: source, featureIds }))
        },
        [dispatch, mapRef],
    )

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!sourceId) {
                return
            }
            setDragStart({ x: e.clientX, y: e.clientY })
            setDragCurrent({ x: e.clientX, y: e.clientY })
        },
        [sourceId],
    )

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!dragStart || !sourceId) {
                return
            }
            const current = { x: e.clientX, y: e.clientY }
            setDragCurrent(current)
            const now = Date.now()
            if (now - lastThrottle.current < THROTTLE_MS) {
                return
            }
            lastThrottle.current = now
            queryAndSelect(dragStart, current, sourceId).catch(() => {
                dispatch(actions.selection.reset())
            })
        },
        [dragStart, sourceId, queryAndSelect, dispatch],
    )

    const handleMouseUp = useCallback(
        (e: React.MouseEvent) => {
            if (!dragStart || !sourceId) {
                return
            }
            const current = { x: e.clientX, y: e.clientY }
            queryAndSelect(dragStart, current, sourceId).catch(() => {
                dispatch(actions.selection.reset())
            })
            setDragStart(null)
            setDragCurrent(null)
        },
        [dragStart, sourceId, queryAndSelect, dispatch],
    )

    // Cancel drag if mouse button is released outside the overlay
    useEffect(() => {
        if (!dragStart) {
            return
        }
        const onWindowMouseUp = () => {
            setDragStart(null)
            setDragCurrent(null)
        }
        window.addEventListener("mouseup", onWindowMouseUp)
        return () => {
            window.removeEventListener("mouseup", onWindowMouseUp)
        }
    }, [dragStart])

    if (mapTool !== "select") {
        return null
    }

    const rectColor = isDark ? "#ffffff" : "#000000"
    const outlineColor = isDark ? "#000000" : "#ffffff"

    const rectStyle: React.CSSProperties = (() => {
        if (!dragStart || !dragCurrent) {
            return { display: "none" }
        }
        const isInclude = dragCurrent.x >= dragStart.x
        const borderStyle = isInclude ? "solid" : "dashed"
        const left = Math.min(dragStart.x, dragCurrent.x)
        const top = Math.min(dragStart.y, dragCurrent.y)
        const width = Math.abs(dragCurrent.x - dragStart.x)
        const height = Math.abs(dragCurrent.y - dragStart.y)
        return {
            position: "fixed",
            left,
            top,
            width,
            height,
            border: `1.5px ${borderStyle} ${rectColor}`,
            outline: `1.5px ${borderStyle} ${outlineColor}`,
            outlineOffset: "0px",
            background: `color-mix(in srgb, ${rectColor} ${RECT_FILL_OPACITY * 100}%, transparent)`,
            pointerEvents: "none",
        }
    })()

    return (
        <>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 5,
                    cursor: "crosshair",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />
            <div style={rectStyle} />
        </>
    )
}
