import { DRAW_WORKING_SET_CAP, FEATURE_HIGHLIGHT_COLOR, PREVIEW_COLOR, PREVIEW_RADIUS } from "@/const"
import { useDrawControl } from "@/hooks/useDrawControl"
import { viewportBbox } from "@/lib/bbox"
import { DrawOpQueue, loadWorkingSet, registerDrawQueue } from "@/lib/draw-session"
import { touchedIds } from "@/lib/draw-working-set"
import { errorMessage } from "@/lib/error-message"
import { selectionGetIds } from "@/lib/selection-ipc"
import { WorkingSetLoader } from "@/lib/working-set-loader"
import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import type { DrawEvent, DrawFeatureId, Id, WorkingSetScope } from "@/types"
import { spherePreset } from "@sphere/draw"
import { Button, Overlay, Row, Surface, Text } from "@sphere/ui"
import type { CSSProperties } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useMap } from "react-map-gl/maplibre"

// Shown instead of loading when the scope holds more than DRAW_WORKING_SET_CAP features
const OVER_CAP_NOTICE: Record<WorkingSetScope["type"], string> = {
    bbox: "Too many features here. Zoom in to edit.",
    ids: "Too many features selected. Cancel and select fewer to edit.",
}

// Covers the map and the draw toolbar while a load or a session end runs. It shares the
// Overlay's layer and is rendered before it, so Cancel and Done stay on top and clickable
const BLOCKER_STYLE: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: "var(--sphere-z-index-app)",
    pointerEvents: "auto",
}

export type DrawProps = {
    mapId: string
    // Fixed for the component's life: mount it with `key={sourceId}`
    sourceId: Id
}

/**
 * The draw UI of one backend draw session. The session itself (begin, commit,
 * rollback) is run by the draw listeners; this component owns the draw control
 * and the op queue that forwards each edit to the backend, and wires a
 * `WorkingSetLoader` to the map to load the features to edit.
 */
export default function Draw({ mapId, sourceId }: DrawProps) {
    const dispatch = useAppDispatch()
    const pending = useAppSelector(selectors.draw.isPending)
    const selectionSourceId = useAppSelector(selectors.selection.sourceId)
    // The scope is chosen once, when drawing starts
    const initialSelectionSourceId = useRef(selectionSourceId)
    // The control is built once, so the outline setting is read once, at mount
    const previewOutline = useAppSelector(selectors.settings.selectPreviewOutline)
    const [styles] = useState(() =>
        spherePreset({
            color: PREVIEW_COLOR,
            highlightColor: FEATURE_HIGHLIGHT_COLOR,
            outline: previewOutline,
            pointRadius: PREVIEW_RADIUS,
        }),
    )
    const [loading, setLoading] = useState(true)
    // The kind of scope that held too many features to load, if the last load did
    const [overCap, setOverCap] = useState<WorkingSetScope["type"] | undefined>(undefined)
    const [queue] = useState(() => new DrawOpQueue(sourceId, err => dispatch(actions.draw.failed(errorMessage(err)))))
    // Ids the user edited, deleted or created: never loaded over or unloaded
    const [pinned] = useState(() => new Set<DrawFeatureId>())
    const loader = useRef<WorkingSetLoader | undefined>(undefined)

    useEffect(() => registerDrawQueue(queue), [queue])

    const onChange = useCallback(
        (event: DrawEvent) => {
            for (const id of touchedIds(event)) {
                pinned.add(id)
            }
        },
        [pinned],
    )

    const { [mapId]: mapRef } = useMap()
    const map = mapRef?.getMap()
    const draw = useDrawControl({
        ref: mapRef,
        onChange,
        ops: queue,
        position: "top-left",
        controls: {
            point: true,
            polygon: true,
            line_string: true,
            combine_features: true,
            uncombine_features: true,
            trash: true,
        },
        displayControlsDefault: false,
        boxSelect: false,
        styles,
    })

    useEffect(() => {
        if (!map) {
            return
        }
        const current = new WorkingSetLoader({
            sourceId,
            cap: DRAW_WORKING_SET_CAP,
            draw,
            queue,
            pinned,
            fetchWorkingSet: loadWorkingSet,
            getSelectionIds: selectionGetIds,
            onLoading: setLoading,
            onOverCap: setOverCap,
            onError: err => dispatch(actions.draw.failed(errorMessage(err))),
            onLoaded: ids => dispatch(actions.draw.setHiddenIds({ sourceId, ids })),
        })
        loader.current = current
        current.begin({
            selectionSourceId: initialSelectionSourceId.current,
            bbox: viewportBbox(map.getBounds()),
        })
        const subscription = map.on("moveend", () => {
            current.moved(viewportBbox(map.getBounds()))
        })
        return () => {
            subscription.unsubscribe()
            current.dispose()
            loader.current = undefined
        }
    }, [map, sourceId, draw, queue, pinned, dispatch])

    useEffect(() => {
        loader.current?.setPending(pending)
    }, [pending])

    const onCancel = useCallback(() => {
        dispatch(actions.draw.cancel({ sourceId }))
    }, [dispatch, sourceId])

    const onDone = useCallback(() => {
        dispatch(actions.draw.commit({ sourceId }))
    }, [dispatch, sourceId])

    const blocked = loading || pending
    const notice =
        overCap === undefined ? null : (
            <Surface>
                <Text>{OVER_CAP_NOTICE[overCap]}</Text>
            </Surface>
        )

    return (
        <>
            {blocked && <div style={BLOCKER_STYLE} />}
            <Overlay
                top={notice}
                bottom={
                    <Row gap="xs">
                        <Button variant="secondary" onClick={onCancel} disabled={pending}>
                            Cancel
                        </Button>
                        <Button onClick={onDone} disabled={blocked}>
                            Done
                        </Button>
                    </Row>
                }
            />
        </>
    )
}
