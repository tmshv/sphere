import { DRAW_WORKING_SET_CAP } from "@/const"
import { useDrawControl } from "@/hooks/useDrawControl"
import { boundsToBbox } from "@/lib/bbox"
import { DrawOpQueue, loadWorkingSet, registerDrawQueue } from "@/lib/draw-session"
import { chooseWorkingSetScope, planWorkingSetUpdate, scopeAfterMove, touchedIds } from "@/lib/draw-working-set"
import { errorMessage } from "@/lib/error-message"
import { selectionGetIds } from "@/lib/selection-ipc"
import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import type { DrawEvent, DrawFeatureId, Id, WorkingSetScope } from "@/types"
import { Button, Overlay, Row, Surface, Text } from "@sphere/ui"
import { useCallback, useEffect, useRef, useState } from "react"
import { useMap } from "react-map-gl/maplibre"

// Shown instead of loading when the scope holds more than DRAW_WORKING_SET_CAP features
const OVER_CAP_NOTICE: Record<WorkingSetScope["type"], string> = {
    bbox: "Too many features here. Zoom in to edit.",
    ids: "Too many features selected. Cancel and select fewer to edit.",
}

export type DrawProps = {
    mapId: string
    // Fixed for the component's life: mount it with `key={sourceId}`
    sourceId: Id
}

/**
 * The draw UI of one backend draw session. The session itself (begin, commit,
 * rollback) is run by the draw listeners; this component owns the draw control
 * and the op queue that forwards each edit to the backend, and loads the
 * working set into draw: the selection when it belongs to this source, else
 * the viewport, re-queried after every move. Features the user touched stay
 * in draw; untouched ones that left the viewport are unloaded.
 */
export default function Draw({ mapId, sourceId }: DrawProps) {
    const dispatch = useAppDispatch()
    const pending = useAppSelector(selectors.draw.isPending)
    const selectionSourceId = useAppSelector(selectors.selection.sourceId)
    // The scope is chosen once, when drawing starts
    const initialSelectionSourceId = useRef(selectionSourceId)
    const [loading, setLoading] = useState(true)
    // The kind of scope that held too many features to load, if the last load did
    const [overCap, setOverCap] = useState<WorkingSetScope["type"] | undefined>(undefined)
    const [queue] = useState(() => new DrawOpQueue(sourceId, err => dispatch(actions.draw.failed(errorMessage(err)))))
    const scope = useRef<WorkingSetScope | undefined>(undefined)
    const loaded = useRef(new Set<DrawFeatureId>())
    const pinned = useRef(new Set<DrawFeatureId>())
    // Only the latest load applies; unmount bumps it too
    const generation = useRef(0)

    useEffect(() => registerDrawQueue(queue), [queue])

    const onChange = useCallback((event: DrawEvent) => {
        for (const id of touchedIds(event)) {
            pinned.current.add(id)
        }
    }, [])

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
    })

    const applyWorkingSet = useCallback(
        async (next: WorkingSetScope, current: number) => {
            // Created features must have their backend ids before the query, or they would load twice
            const flushed = await queue.flush()
            if (!flushed.ok) {
                // Already surfaced by the queue; the backend lags behind the map, so load nothing more
                return
            }
            const workingSet = await loadWorkingSet(sourceId, next, DRAW_WORKING_SET_CAP)
            if (current !== generation.current) {
                return
            }
            if (workingSet.overCap) {
                setOverCap(next.type)
                return
            }
            setOverCap(undefined)
            const plan = planWorkingSetUpdate({
                loaded: loaded.current,
                pinned: new Set([...pinned.current, ...queue.createdIds()]),
                incoming: workingSet.features.features,
            })
            // Load first: if it throws, nothing was unloaded and `loaded` still matches draw
            draw.load({ type: "FeatureCollection", features: plan.add })
            draw.unload(plan.unload)
            loaded.current = plan.loaded
        },
        [queue, sourceId, draw],
    )

    // Blocks the map while the working set loads; an older load that resolves late is dropped
    const refresh = useCallback(
        (next: WorkingSetScope) => {
            generation.current += 1
            const current = generation.current
            setLoading(true)
            applyWorkingSet(next, current)
                .catch(err => {
                    dispatch(actions.draw.failed(errorMessage(err)))
                })
                .finally(() => {
                    if (current === generation.current) {
                        setLoading(false)
                    }
                })
        },
        [applyWorkingSet, dispatch],
    )

    useEffect(() => {
        if (!map) {
            return
        }
        let active = true
        selectionGetIds()
            .then(selectionIds => {
                if (!active) {
                    return
                }
                scope.current = chooseWorkingSetScope({
                    sourceId,
                    selectionSourceId: initialSelectionSourceId.current,
                    selectionIds,
                    bbox: boundsToBbox(map.getBounds()),
                })
                refresh(scope.current)
            })
            .catch(err => {
                dispatch(actions.draw.failed(errorMessage(err)))
                setLoading(false)
            })
        return () => {
            active = false
            generation.current += 1
        }
    }, [map, sourceId, refresh, dispatch])

    useEffect(() => {
        if (!map) {
            return
        }
        const subscription = map.on("moveend", () => {
            const next = scopeAfterMove(scope.current, boundsToBbox(map.getBounds()))
            if (next) {
                refresh(next)
            }
        })
        return () => {
            subscription.unsubscribe()
        }
    }, [map, refresh])

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
            {blocked && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 101,
                        pointerEvents: "auto",
                    }}
                />
            )}
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
