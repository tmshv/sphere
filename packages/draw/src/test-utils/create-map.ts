import { bboxClip } from "@turf/bbox-clip"
import type { BBox } from "geojson"
import type { IControl, Map as MapLibreMap } from "maplibre-gl"
import type { DrawRenderFeature, Interaction, ScreenPoint } from "../types"
import Evented from "./evented"

/** A map interaction handler (`map.dragPan` and the like): only its enabled flag. */
export interface MockInteraction {
    enabled: boolean
    disable(): void
    enable(): void
    isEnabled(): boolean
}

/** The data of a GeoJSON source Draw adds to the map. */
export interface MockSourceData {
    type: "FeatureCollection"
    features: DrawRenderFeature[]
}

/** A source added with `map.addSource`. */
export interface MockSource {
    type?: string
    data: MockSourceData
}

/** What `map.getSource` returns: a copy of the source that can replace the original's data. */
export interface MockSourceHandle extends Partial<MockSource> {
    setData(data: MockSourceData): void
}

export interface MockMapOptions {
    container?: HTMLElement
}

/** A corner of a `queryRenderedFeatures` box: `[x, y]` or a screen point. */
export type MockBoxCorner = [number, number] | ScreenPoint

function createInteraction(): MockInteraction {
    return {
        enabled: true,
        disable() {
            this.enabled = false
        },
        enable() {
            this.enabled = true
        },
        isEnabled() {
            return this.enabled
        },
    }
}

function toXY(corner: MockBoxCorner): [number, number] {
    if (Array.isArray(corner)) return corner
    return [corner.x, corner.y]
}

/**
 * A stand-in for MapLibre's `Map` with just the members Draw uses. It fires
 * `load` on the next tick. Pass it to source code typed as a MapLibre map
 * with `asMapLibreMap`.
 */
export class MockMap extends Evented implements Record<Interaction, MockInteraction> {
    sources: Record<string, MockSource> = {}
    options: { container: HTMLElement }

    scrollZoom = createInteraction()
    boxZoom = createInteraction()
    dragRotate = createInteraction()
    dragPan = createInteraction()
    keyboard = createInteraction()
    doubleClickZoom = createInteraction()
    touchZoomRotate = createInteraction()

    constructor(options: MockMapOptions = {}) {
        super()

        this.options = {
            container: document.createElement("div"),
            ...options,
        }

        setTimeout(() => {
            this.fire("load")
        }, 0)
    }

    addControl(control: IControl): void {
        control.onAdd(asMapLibreMap(this))
    }

    loaded(): boolean {
        return true
    }

    getContainer(): HTMLElement {
        return this.options.container
    }

    addSource(name: string, source: MockSource): void {
        this.sources[name] = source
    }

    removeSource(name: string): void {
        delete this.sources[name]
    }

    getSource(name: string): MockSourceHandle {
        const source = Object.hasOwn(this.sources, name) ? this.sources[name] : undefined
        return {
            ...source,
            setData(data) {
                if (source === undefined) throw new TypeError(`Mock map has no source ${name}`)
                source.data = data
            },
        }
    }

    addLayer(): void {}

    getLayer(): undefined {
        return undefined
    }

    queryRenderedFeatures([corner0, corner1]: [MockBoxCorner, MockBoxCorner]): DrawRenderFeature[] {
        const p0 = toXY(corner0)
        const p1 = toXY(corner1)
        const minX = Math.min(p0[0], p1[0])
        const minY = Math.min(p0[1], p1[1])
        const maxX = Math.max(p0[0], p1[0])
        const maxY = Math.max(p0[1], p1[1])
        const bbox: BBox = [minX, minY, maxX, maxY]
        const features: DrawRenderFeature[] = []

        for (const source of Object.values(this.sources)) {
            for (const feature of source.data.features) {
                const geometry = feature.geometry
                if (geometry.type === "Point") {
                    const [x, y] = geometry.coordinates
                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) features.push(feature)
                } else if (geometry.type === "MultiPoint") {
                    for (const [x, y] of geometry.coordinates) {
                        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                            features.push(feature)
                            break
                        }
                    }
                } else {
                    const clipped = bboxClip(geometry, bbox)
                    if (clipped.geometry.coordinates.length) features.push(feature)
                }
            }
        }
        return features
    }
}

/**
 * The mock map as a MapLibre map, to hand it to source code (a Draw context,
 * `Store`, `control.onAdd`). It is the same object.
 */
export function asMapLibreMap(map: MockMap): MapLibreMap {
    // The mock implements only the parts of `Map` that Draw calls, so it cannot match the class structurally
    return map as unknown as MapLibreMap
}

export default function createMap(mapOptions?: MockMapOptions): MockMap {
    return new MockMap(mapOptions)
}
