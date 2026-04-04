import { DRAW_ORIG_ID_KEY } from "@/const"
import { useDrawControl } from "@/hooks/useDrawControl"
import type { DrawEvent } from "@/hooks/useDrawControl"
import { loadDrawFeatures } from "@/lib/draw-source"
import logger from "@/logger"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { Overlay } from "@/ui/Overlay"
import { Button, Flex } from "@mantine/core"
import { useCallback, useEffect, useRef, useState } from "react"
import { useMap } from "react-map-gl/maplibre"

export type DrawProps = {
    mapId: string
}

type ChangeTracker = {
    created: Set<string>
    updated: Set<string>
    deleted: Map<string, string | number | undefined>
}

function newTracker(): ChangeTracker {
    return {
        created: new Set(),
        updated: new Set(),
        deleted: new Map(),
    }
}

function trackDelete(t: ChangeTracker, feature: GeoJSON.Feature, key: string) {
    const drawId = String(feature.id)
    if (t.created.has(drawId)) {
        t.created.delete(drawId)
    } else {
        const origId = feature.properties?.[key]
        t.deleted.set(drawId, origId)
        t.updated.delete(drawId)
    }
}

export default function Draw({ mapId }: DrawProps) {
    const dispatch = useAppDispatch()
    const sourceId = useAppSelector(state => state.draw.sourceId)
    const [loading, setLoading] = useState(true)

    const tracker = useRef<ChangeTracker>(newTracker())
    const loadingRef = useRef(true)

    const onChange = useCallback((event: DrawEvent) => {
        if (loadingRef.current) return
        const t = tracker.current
        switch (event.type) {
            case "draw.create": {
                for (const feature of event.features ?? []) {
                    t.created.add(String(feature.id))
                }
                break
            }
            case "draw.update": {
                for (const feature of event.features ?? []) {
                    const drawId = String(feature.id)
                    if (!t.created.has(drawId)) {
                        t.updated.add(drawId)
                    }
                }
                break
            }
            case "draw.delete": {
                for (const feature of event.features ?? []) {
                    trackDelete(t, feature, DRAW_ORIG_ID_KEY)
                }
                break
            }
            case "draw.combine": {
                for (const feature of event.deletedFeatures ?? []) {
                    trackDelete(t, feature, DRAW_ORIG_ID_KEY)
                }
                for (const feature of event.createdFeatures ?? []) {
                    t.created.add(String(feature.id))
                }
                break
            }
            case "draw.uncombine": {
                for (const feature of event.deletedFeatures ?? []) {
                    trackDelete(t, feature, DRAW_ORIG_ID_KEY)
                }
                for (const feature of event.createdFeatures ?? []) {
                    t.created.add(String(feature.id))
                }
                break
            }
        }
    }, [])

    const { [mapId]: ref } = useMap()
    const draw = useDrawControl({
        ref,
        onChange,
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

    useEffect(() => {
        if (!sourceId) return
        setLoading(true)
        loadingRef.current = true
        loadDrawFeatures(sourceId)
            .then(fc => {
                if (!fc) return
                tracker.current = newTracker()
                draw.set(fc)
            })
            .catch(err => {
                logger.error("Failed to load draw source %s: %s", sourceId, err)
            })
            .finally(() => {
                loadingRef.current = false
                setLoading(false)
            })
    }, [sourceId, draw])

    const onCancel = useCallback(() => {
        dispatch(actions.tools.reset())
    }, [dispatch])

    const onDone = useCallback(() => {
        if (!sourceId || loading) return
        const t = tracker.current
        const all = draw.getAll()

        const added: GeoJSON.Feature[] = []
        const updated: GeoJSON.Feature[] = []
        for (const feature of all.features) {
            const drawId = String(feature.id)
            const origId = feature.properties?.[DRAW_ORIG_ID_KEY]
            if (feature.properties) {
                delete feature.properties[DRAW_ORIG_ID_KEY]
            }
            if (t.created.has(drawId)) {
                // biome-ignore lint/performance/noDelete: need to omit id from serialized GeoJSON
                delete feature.id
                added.push(feature)
            } else if (t.updated.has(drawId)) {
                if (origId !== undefined) {
                    feature.id = origId
                }
                updated.push(feature)
            }
        }

        const deleted_ids: (string | number)[] = []
        for (const [, origId] of t.deleted) {
            if (origId !== undefined) {
                deleted_ids.push(origId)
            }
        }

        dispatch(
            actions.draw.commit({
                sourceId,
                patch: { added, updated, deleted_ids },
            }),
        )
    }, [dispatch, sourceId, loading, draw])

    return (
        <>
            {loading && (
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
                bottom={
                    <Flex gap="xs">
                        <Button size="xs" color="gray" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button size="xs" onClick={onDone} disabled={loading}>
                            Done
                        </Button>
                    </Flex>
                }
            />
        </>
    )
}
