import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { ImageMarker } from "@/ui/ImageMarker"
import { useCallback, useEffect, useState } from "react"
import { Marker, useMap } from "react-map-gl"
import { Badge } from "./Badge"
import { PhotoCluster, RenderPhotoFunction } from "./PhotoCluster"

export type GetImageFunction = (p: GeoJSON.GeoJsonProperties) => {
    src: string,
    iconSrc: string,
    value: number
}

export type PhotoLayerProps = {
    layerId: string
    sourceId: string
    clusterRadius: number
    getImage: GetImageFunction
    iconSize: number
    iconSizeCluster?: number
}

export const PhotoLayer: React.FC<PhotoLayerProps> = ({ sourceId, layerId, clusterRadius, getImage, iconSize, iconSizeCluster }) => {
    const { current } = useMap()
    const [activeImage, setActiveImage] = useState<string | number | null>(null)
    const features = useAppSelector(state => {
        const source = state.source.items[sourceId]
        switch (source.type) {
            case SourceType.FeatureCollection: {
                if (source.pending) {
                    return []
                }
                return source.dataset.features
                    .filter(f => {
                        const { src, iconSrc } = getImage(f.properties!)
                        return !!src && !!iconSrc
                    })
            }
            case SourceType.MVT: {
                // const layer = state.layer.items[layerId]
                // const map = current?.getMap()
                // if (map) {
                //     features = map?.queryRenderedFeatures(undefined, {
                //         layers: [layerId],
                //     })
                // }
                return []
            }
            default: {
                return []
            }
        }
    })

    useEffect(() => {
        const map = current?.getMap()
        if (!map) {
            return
        }

        const cb = () => {
            setActiveImage(null)
        }

        map.on("click", cb)

        return () => {
            map.off("click", cb)
        }
    }, [current])

    if (features.length === 0) {
        return null
    }

    const renderPhoto = useCallback<RenderPhotoFunction>((feature, isCluster) => {
        const [lng, lat] = feature.geometry.coordinates
        let id = feature.id!

        if (isCluster) {
            const url = feature.properties!.url
            id = feature.properties!.cluster_id
            const clusterSize = feature.properties!.point_count

            return (
                <Marker key={id} longitude={lng} latitude={lat}>
                    <ImageMarker
                        src={url}
                        size={iconSizeCluster ?? iconSize}
                        layout={"circle"}
                    >
                        <Badge
                            top={-6}
                            right={-6}
                        >
                            {clusterSize}
                        </Badge>
                    </ImageMarker>
                </Marker>
            )
        }

        const { src, iconSrc } = getImage(feature.properties!)
        const active = activeImage === id

        return (
            <div key={id} style={{ position: "relative", zIndex: 0 }}>
                <Marker
                    longitude={lng}
                    latitude={lat}
                    onClick={(event) => {
                        event.originalEvent.stopPropagation()
                        setActiveImage(id)
                    }}
                    style={{
                        zIndex: active ? 100 : 1,
                    }}
                >
                    <ImageMarker
                        src={active ? src : iconSrc}
                        size={active ? 300 : iconSize}
                        layout={active ? "square" : "circle"}
                    />
                </Marker>
            </div>
        )
    }, [iconSize, getImage, activeImage])

    return (
        <PhotoCluster
            radius={clusterRadius}
            data={features as any}
            renderPhoto={renderPhoto}
            mapProperties={p => {
                const { iconSrc, value } = getImage(p)
                return {
                    value,
                    url: iconSrc ?? "",
                }
            }}
        />
    )
}
