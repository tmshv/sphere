import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { appSlice } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { isRectSelectEnabled } from "@/lib/map-tools"
import { useCallback, useEffect, useRef, useState } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import type { RectSelectModifier } from "@/store/rect-select"

type Point = { x: number; y: number }

const RECT_FILL_OPACITY = 0.1
const DRAG_THRESHOLD = 3

function getModifier(e: React.MouseEvent | MouseEvent): RectSelectModifier {
    if (e.shiftKey) return "shift"
    if (e.ctrlKey || e.metaKey) return "ctrl"
    return "none"
}

function distance(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

const STROKE_WIDTH = 1.5
const DASH_LENGTH = 6
const MARKER_HALF = 8

type RectShapeProps = {
    width: number
    height: number
    stroke: string
    markerFill: string
}

function DashedRect({ width, height, stroke, markerFill }: RectShapeProps) {
    return (
        <>
            <rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill="none"
                stroke={markerFill}
                strokeWidth={STROKE_WIDTH}
            />
            <rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill="none"
                stroke={stroke}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${DASH_LENGTH} ${DASH_LENGTH}`}
            />
        </>
    )
}

function SolidRect({ width, height, stroke, markerFill }: RectShapeProps) {
    const h = MARKER_HALF
    const sw = STROKE_WIDTH
    return (
        <>
            <rect x={0} y={0} width={width} height={height} fill="none" stroke={stroke} strokeWidth={sw} />
            {/* corner markers — L-shaped */}
            <polyline points={`${h},0 0,0 0,${h}`} fill="none" stroke={markerFill} strokeWidth={sw} />
            <polyline
                points={`${width - h},0 ${width},0 ${width},${h}`}
                fill="none"
                stroke={markerFill}
                strokeWidth={sw}
            />
            <polyline
                points={`0,${height - h} 0,${height} ${h},${height}`}
                fill="none"
                stroke={markerFill}
                strokeWidth={sw}
            />
            <polyline
                points={`${width},${height - h} ${width},${height} ${width - h},${height}`}
                fill="none"
                stroke={markerFill}
                strokeWidth={sw}
            />
        </>
    )
}

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
    const isDragging = useRef(false)

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!sourceId) return
            isDragging.current = false
            setDragStart({ x: e.clientX, y: e.clientY })
            setDragCurrent(null)
        },
        [sourceId],
    )

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!dragStart || !sourceId) return
            const current = { x: e.clientX, y: e.clientY }

            if (!isDragging.current) {
                if (distance(dragStart, current) < DRAG_THRESHOLD) {
                    return
                }
                isDragging.current = true
            }

            setDragCurrent(current)
            dispatch(
                actions.rectSelect.drag({
                    start: dragStart,
                    current,
                    modifier: getModifier(e),
                }),
            )
        },
        [dragStart, sourceId, dispatch],
    )

    const handleMouseUp = useCallback(
        (e: React.MouseEvent) => {
            if (!dragStart || !sourceId) return

            if (!isDragging.current) {
                dispatch(
                    actions.rectSelect.click({
                        point: dragStart,
                        modifier: getModifier(e),
                    }),
                )
            } else {
                const current = { x: e.clientX, y: e.clientY }
                dispatch(
                    actions.rectSelect.commit({
                        start: dragStart,
                        current,
                        modifier: getModifier(e),
                    }),
                )
            }

            isDragging.current = false
            setDragStart(null)
            setDragCurrent(null)
        },
        [dragStart, sourceId, dispatch],
    )

    const forwardToCanvas = useCallback(
        (e: React.SyntheticEvent) => {
            const canvas = mapRef?.getMap()?.getCanvas()
            if (canvas) {
                canvas.dispatchEvent(new (e.nativeEvent.constructor as typeof Event)(e.type, e.nativeEvent))
            }
        },
        [mapRef],
    )

    useEffect(() => {
        if (!dragStart) return
        const onWindowMouseUp = () => {
            isDragging.current = false
            setDragStart(null)
            setDragCurrent(null)
        }
        window.addEventListener("mouseup", onWindowMouseUp)
        return () => {
            window.removeEventListener("mouseup", onWindowMouseUp)
        }
    }, [dragStart])

    if (!isRectSelectEnabled(mapTool)) {
        return null
    }

    const showRect = dragStart !== null && dragCurrent !== null
    const isInclude = showRect && dragCurrent.x >= dragStart.x

    const left = showRect ? Math.min(dragStart.x, dragCurrent.x) : 0
    const top = showRect ? Math.min(dragStart.y, dragCurrent.y) : 0
    const width = showRect ? Math.abs(dragCurrent.x - dragStart.x) : 0
    const height = showRect ? Math.abs(dragCurrent.y - dragStart.y) : 0

    const stroke = isDark ? "#ffffff" : "#000000"
    const markerFill = isDark ? "#000000" : "#ffffff"
    const fill = isDark ? `rgba(255,255,255,${RECT_FILL_OPACITY})` : `rgba(0,0,0,${RECT_FILL_OPACITY})`

    return (
        <>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 5,
                    cursor: "default",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={forwardToCanvas}
                onContextMenu={forwardToCanvas}
            />
            {showRect && (
                <svg
                    aria-hidden="true"
                    style={{
                        position: "fixed",
                        left,
                        top,
                        width,
                        height,
                        pointerEvents: "none",
                        overflow: "visible",
                    }}
                >
                    <rect x={0} y={0} width={width} height={height} fill={fill} stroke="none" />
                    {isInclude ? (
                        <SolidRect width={width} height={height} stroke="#000000" markerFill="#ffffff" />
                    ) : (
                        <DashedRect width={width} height={height} stroke={stroke} markerFill={markerFill} />
                    )}
                </svg>
            )}
        </>
    )
}
