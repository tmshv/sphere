import { ImageMarker, ImageMarkerLayout } from "@/ui/ImageMarker"
import { useCallback, useEffect, useState } from "react"
import { Marker, useMap } from "react-map-gl"
import { Badge } from "./Badge"
import { PhotoCluster, RenderPhotoFunction } from "./PhotoCluster"
import { useDispatch } from "react-redux"
import { actions } from "@/store"
import * as maplibregl from "maplibre-gl"
import { InvisibleCircleLayer } from "./InvisibleCircleLayer"
import type { GetImageFunction } from "./types"
import { useFeatures } from "./hooks"

export type PhotoLayerProps = {
    layerId: string
    sourceId: string
    clusterRadius: number
    getImage: GetImageFunction
    iconLayout: ImageMarkerLayout
    iconSize: number
    iconSizeCluster?: number
}

export const PhotoLayer: React.FC<PhotoLayerProps> = ({ sourceId, layerId, clusterRadius, getImage, iconLayout, iconSize, iconSizeCluster }) => {
    const invisiblePointsLayer = `${layerId}-invisible-points`
    const dispatch = useDispatch()
    const { current } = useMap()
    const [activeImage, setActiveImage] = useState<string | number | null>(null)
    const sourceLayer = "sndl"
    const features = useFeatures({
        sourceId,
        layerId: invisiblePointsLayer,
        map: current?.getMap() as unknown as maplibregl.Map,
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

    const renderPhoto = useCallback<RenderPhotoFunction>((feature, isCluster) => {
        const [lng, lat] = feature.geometry.coordinates
        let id = feature.id! // useFeatures hook makes sure feature has id

        if (isCluster) {
            const src = feature.properties!.src
            id = feature.properties!.cluster_id
            const clusterSize = feature.properties!.point_count

            return (
                <Marker key={id} longitude={lng} latitude={lat}>
                    <ImageMarker
                        src={src}
                        size={iconSizeCluster ?? iconSize}
                        layout={iconLayout}
                        onHover={() => {
                            dispatch(actions.properties.set({
                                values: feature.properties!,
                            }))
                        }}
                    >
                        <Badge
                            top={-12}
                            right={-12}
                        >
                            {clusterSize}
                        </Badge>
                    </ImageMarker>
                </Marker>
            )
        }

        const { src } = getImage(feature.properties!)
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
                        zIndex: active
                            ? 100
                            : 1,
                    }}
                >
                    <ImageMarker
                        src={src}
                        size={iconSize}
                        layout={iconLayout}
                        onHover={() => {
                            dispatch(actions.properties.set({
                                values: feature.properties!,
                            }))
                        }}
                    />
                </Marker>
            </div>
        )
    }, [iconSize, getImage, activeImage])

    return (
        <>
            <InvisibleCircleLayer
                layerId={invisiblePointsLayer}
                sourceId={sourceId}
                sourceLayer={sourceLayer}
            />
            <PhotoCluster
                radius={clusterRadius}
                data={features.filter(f => {
                    const { src } = getImage(f.properties!)
                    return !!src
                }) as any}
                renderPhoto={renderPhoto}
                mapProperties={getImage}
            />
        </>
    )
}
