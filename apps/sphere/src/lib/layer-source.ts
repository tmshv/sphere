const FILTERED_SOURCE_PREFIX = "layer-"

export function filteredSourceId(layerId: string): string {
    return `${FILTERED_SOURCE_PREFIX}${layerId}`
}

/**
 * Returns the layer id encoded in a filtered side-source id, or null when the
 * id refers to a real source rather than a filter side-source.
 */
export function filteredLayerId(mapSourceId: string): string | null {
    if (!mapSourceId.startsWith(FILTERED_SOURCE_PREFIX)) {
        return null
    }
    return mapSourceId.slice(FILTERED_SOURCE_PREFIX.length)
}

export function resolveSourceId(mapSourceId: string, layers: Record<string, { sourceId?: string }>): string {
    const layerId = filteredLayerId(mapSourceId)
    if (layerId === null) {
        return mapSourceId
    }
    return layers[layerId]?.sourceId ?? mapSourceId
}
