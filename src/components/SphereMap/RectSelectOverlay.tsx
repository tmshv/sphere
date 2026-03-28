import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { appSlice } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { useCallback, useEffect, useState } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import type { RectSelectModifier } from "@/store/rect-select"

type Point = { x: number; y: number }

const RECT_FILL_OPACITY = 0.1

function getModifier(e: React.MouseEvent | MouseEvent): RectSelectModifier {
    if (e.shiftKey) return "shift"
    if (e.ctrlKey || e.metaKey) return "ctrl"
    return "none"
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

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!sourceId) return
            setDragStart({ x: e.clientX, y: e.clientY })
            setDragCurrent({ x: e.clientX, y: e.clientY })
        },
        [sourceId],
    )

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!dragStart || !sourceId) return
            const current = { x: e.clientX, y: e.clientY }
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
            const current = { x: e.clientX, y: e.clientY }
            dispatch(
                actions.rectSelect.commit({
                    start: dragStart,
                    current,
                    modifier: getModifier(e),
                }),
            )
            setDragStart(null)
            setDragCurrent(null)
        },
        [dragStart, sourceId, dispatch],
    )

    useEffect(() => {
        if (!dragStart) return
        const onWindowMouseUp = () => {
            setDragStart(null)
            setDragCurrent(null)
        }
        window.addEventListener("mouseup", onWindowMouseUp)
        return () => {
            window.removeEventListener("mouseup", onWindowMouseUp)
        }
    }, [dragStart])

    const forwardToCanvas = useCallback(
        (e: React.SyntheticEvent) => {
            const canvas = mapRef?.getMap()?.getCanvas()
            if (canvas) {
                canvas.dispatchEvent(new (e.nativeEvent.constructor as typeof Event)(e.type, e.nativeEvent))
            }
        },
        [mapRef],
    )

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
                    cursor: "default",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={forwardToCanvas}
                onContextMenu={forwardToCanvas}
            />
            <div style={rectStyle} />
        </>
    )
}
