import { DRAW_WORKING_SET_CAP, FEATURE_HIGHLIGHT_COLOR, PREVIEW_COLOR, PREVIEW_RADIUS } from "@/const"
import { useDrawControl } from "@/hooks/useDrawControl"
import { viewportBbox } from "@/lib/bbox"
import { registerDrawControl } from "@/lib/draw-control"
import { applyDelta, drawSelectionIds } from "@/lib/draw-selection"
import { DrawOpQueue, loadWorkingSet, registerDrawQueue } from "@/lib/draw-session"
import { touchedIds } from "@/lib/draw-working-set"
import { errorMessage } from "@/lib/error-message"
import { onSelectionDelta, onSelectionReconcile } from "@/lib/selection-bus"
import { selectionGetIds } from "@/lib/selection-ipc"
import { WorkingSetLoader } from "@/lib/working-set-loader"
import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import type { DrawActionable, DrawEvent, DrawFeatureId, Id, WorkingSetScope } from "@/types"
import { spherePreset } from "@sphere/draw"
import { Overlay, Surface, Text } from "@sphere/ui"
import type { CSSProperties } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useMap } from "react-map-gl/maplibre"
import { DrawToolbar } from "./DrawToolbar"

// Shown instead of loading when the scope holds more than DRAW_WORKING_SET_CAP features
const OVER_CAP_NOTICE: Record<WorkingSetScope["type"], string> = {
    bbox: "Too many features here. Zoom in to edit.",
    ids: "Too many features selected. Select fewer to edit.",
}

// Covers the map and the draw toolbar while a load or a session end runs. It shares the
// Overlay's layer and is rendered before it, so the toolbar stays on top and Cancel clickable
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
 *
 * The backend holds the only selection. Draw's own selection changes go to the
 * draw-selection listener, which mirrors them to the backend; every selection
 * delta on the bus is pushed back into draw silently, and the loader loads the
 * selected features draw does not hold yet.
 */
export default function Draw({ mapId, sourceId }: DrawProps) {
    const dispatch = useAppDispatch()
    const pending = useAppSelector(selectors.draw.isPending)
    const selectionSourceId = useAppSelector(selectors.selection.sourceId)
    // Whether the selection belongs to the drawn source is read once, when drawing starts: only then
    // does the backend selection become draw's; later changes come through the selection bus
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

    const onSelectionChange = useCallback(
        (ids: DrawFeatureId[]) => {
            dispatch(actions.draw.selectionChanged({ sourceId, ids }))
        },
        [dispatch, sourceId],
    )

    const onModeChange = useCallback(
        (mode: string) => {
            dispatch(actions.draw.modeChanged({ sourceId, mode }))
        },
        [dispatch, sourceId],
    )

    const onActionableChange = useCallback(
        (actionable: DrawActionable) => {
            dispatch(actions.draw.actionableChanged({ sourceId, actionable }))
        },
        [dispatch, sourceId],
    )

    const { [mapId]: mapRef } = useMap()
    const map = mapRef?.getMap()
    const draw = useDrawControl({
        ref: mapRef,
        onChange,
        onSelectionChange,
        onModeChange,
        onActionableChange,
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
        // The app's draw toolbar shows the tools; `controls` still enables their keys
        buttons: false,
        boxSelect: false,
        styles,
    })

    // The draw toolbar listener runs the toolbar's actions on this control
    useEffect(() => registerDrawControl(sourceId, draw), [sourceId, draw])

    useEffect(() => {
        if (!map) {
            return
        }
        // The backend selection, mirrored from the selection bus. The loader reads the same set
        let selected = new Set<number>()
        // Draw selects the selected features it holds, silently: draw already agrees after its own change.
        // Only the held features are looked up, so a huge selection costs no more than the working set
        const pushSelection = () => {
            draw.setSelected(drawSelectionIds(selected, current.held(), id => queue.backendId(id)))
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
            onLoaded: ids => {
                dispatch(actions.draw.setHiddenIds({ sourceId, ids }))
                pushSelection()
            },
            onSelection: ids => {
                selected = ids
            },
        })
        const followSelection = () => {
            current.selectionChanged(selected)
            pushSelection()
        }
        const unsubscribeDelta = onSelectionDelta((delta, { dragging }) => {
            applyDelta(selected, delta)
            // A step of a rectangle drag only selects what draw holds; the drag's end loads the rest
            if (dragging) {
                pushSelection()
            } else {
                followSelection()
            }
        })
        const unsubscribeReconcile = onSelectionReconcile(({ ids, sourceId: target }) => {
            // While drawing the selection belongs to the drawn source; one of another source is not draw's
            selected = new Set(target === sourceId ? ids : [])
            followSelection()
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
            unsubscribeDelta()
            unsubscribeReconcile()
            subscription.unsubscribe()
            current.dispose()
            loader.current = undefined
        }
    }, [map, sourceId, draw, queue, pinned, dispatch])

    useEffect(() => {
        loader.current?.setPending(pending)
    }, [pending])

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
            <Overlay top={notice} bottom={<DrawToolbar sourceId={sourceId} blocked={blocked} pending={pending} />} />
        </>
    )
}
