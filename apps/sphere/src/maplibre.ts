import "maplibre-gl/dist/maplibre-gl.css"
import "@hyvilo/maplibre-gl-draw/dist/maplibre-gl-draw.css"

import { addProtocol, setWorkerUrl } from "maplibre-gl"
// maplibre-gl v6 is ESM-only and loads its worker as a real URL. Bundlers cannot
// resolve that URL from `import.meta.url`, so the worker bundle is registered once
// here. `?worker&url` (not plain `?url`) routes the file through Vite's worker
// pipeline so the emitted chunk carries its shared sibling module with it.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"

import { MapboxProtocol } from "@/lib/mapbox-protocol"
import { SphereProtocol } from "@/lib/sphere-protocol"

const MAPBOX_ACCESS_TOKEN = ""

export function setupMaplibre() {
    setWorkerUrl(maplibreWorkerUrl)

    const mb = new MapboxProtocol(MAPBOX_ACCESS_TOKEN)
    addProtocol(mb.name, mb.createHandler())

    const sp = new SphereProtocol()
    addProtocol(sp.name, sp.createHandler())
}
