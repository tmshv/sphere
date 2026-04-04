const FILTERED_SOURCE_PREFIX = "layer-"

export function filteredSourceId(layerId: string): string {
    return `${FILTERED_SOURCE_PREFIX}${layerId}`
}

export function resolveSourceId(mapSourceId: string, layers: Record<string, { sourceId?: string }>): string {
    if (mapSourceId.startsWith(FILTERED_SOURCE_PREFIX)) {
        const layerId = mapSourceId.slice(FILTERED_SOURCE_PREFIX.length)
        return layers[layerId]?.sourceId ?? mapSourceId
    }
    return mapSourceId
}
