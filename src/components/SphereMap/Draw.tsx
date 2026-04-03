import { useDrawControl } from "@/hooks/useDrawControl"
import type { DrawEvent } from "@/hooks/useDrawControl"
import logger from "@/logger"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { Overlay } from "@/ui/Overlay"
import { Button, Flex } from "@mantine/core"
import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
    const selectedIds = useAppSelector(state => state.draw.selectedIds)
    const origIdKey = useMemo(() => `__sphere_draw_${crypto.randomUUID().replace(/-/g, "")}_origid`, [])
    const [loading, setLoading] = useState(true)

    const tracker = useRef<ChangeTracker>(newTracker())
    const loadingRef = useRef(true)

    const onChange = useCallback(
        (event: DrawEvent) => {
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
                        trackDelete(t, feature, origIdKey)
                    }
                    break
                }
                case "draw.combine": {
                    for (const feature of event.deletedFeatures ?? []) {
                        trackDelete(t, feature, origIdKey)
                    }
                    for (const feature of event.createdFeatures ?? []) {
                        t.created.add(String(feature.id))
                    }
                    break
                }
                case "draw.uncombine": {
                    for (const feature of event.deletedFeatures ?? []) {
                        trackDelete(t, feature, origIdKey)
                    }
                    for (const feature of event.createdFeatures ?? []) {
                        t.created.add(String(feature.id))
                    }
                    break
                }
            }
        },
        [origIdKey],
    )

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
        const fetchData =
            selectedIds.length > 0
                ? invoke<string>("source_get_slice", { id: sourceId, ids: selectedIds })
                : invoke<string>("source_get", { id: sourceId })
        fetchData
            .then(json => {
                const fc: GeoJSON.FeatureCollection = JSON.parse(json)
                for (const feature of fc.features) {
                    if (feature.id !== undefined && feature.id !== null) {
                        if (!feature.properties) {
                            feature.properties = {}
                        }
                        feature.properties[origIdKey] = feature.id
                    }
                }
                tracker.current = newTracker()
                draw.set(fc)
                loadingRef.current = false
                setLoading(false)
            })
            .catch(err => {
                logger.error("Failed to load draw source %s: %s", sourceId, err)
                loadingRef.current = false
                setLoading(false)
            })
    }, [sourceId, selectedIds, draw, origIdKey])

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
            const origId = feature.properties?.[origIdKey]
            if (feature.properties) {
                delete feature.properties[origIdKey]
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
    }, [dispatch, sourceId, loading, draw, origIdKey])

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
