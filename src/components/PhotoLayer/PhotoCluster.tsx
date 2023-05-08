import { ClustersOptions, useClusters } from "@/hooks/useClusters"
import { useMemo } from "react"

export type RenderPhotoFunction = (feature: GeoJSON.Feature<GeoJSON.Point>, isCluster: boolean) => React.ReactNode
export type MapPropertiesFunction = (properties: GeoJSON.GeoJsonProperties) => { url: string, value: number }

export type PhotoClusterProps = {
    radius: number
    data: GeoJSON.Feature<GeoJSON.Point, GeoJSON.GeoJsonProperties>[]
    mapProperties: MapPropertiesFunction
    renderPhoto: RenderPhotoFunction
}

export const PhotoCluster: React.FC<PhotoClusterProps> = ({ radius, data, mapProperties, renderPhoto }) => {
    type Props = {
        [key: string]: string | number
    }
    const options = useMemo<ClustersOptions<Props, Props>>(() => ({
        minZoom: 0,
        maxZoom: 22,
        radius,
        extent: 512,
        nodeSize: 64,
        map: mapProperties,
        reduce: (acc, props) => {
            if (acc.value < props.value) {
                acc.value = props.value
                acc.url = props.url
            }
        },
    }), [radius, mapProperties])
    const { clusters } = useClusters<Props, Props>("spheremap", data, "moveend", options)

    return (
        <>
            {clusters.map(cluster => {
                const isCluster = cluster.properties?.cluster as boolean
                return renderPhoto(cluster, isCluster)
            })}
        </>
    )
}

