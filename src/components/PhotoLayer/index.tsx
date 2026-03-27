import { actions } from "@/store"
import { ImageMarker, type ImageMarkerLayout } from "@/ui/ImageMarker"
import { useCallback, useEffect, useState } from "react"
import { Marker, useMap } from "react-map-gl/maplibre"
import { useDispatch } from "react-redux"
import { Badge } from "./Badge"
import { InvisibleCircleLayer } from "./InvisibleCircleLayer"
import { PhotoCluster, type RenderPhotoFunction } from "./PhotoCluster"
import { useFeatures } from "./hooks"
import type { GetImageFunction } from "./types"
import type { FilterSpecification } from "maplibre-gl"

const PHOTO_CONTAINER_STYLE: React.CSSProperties = { position: "relative", zIndex: 0 }
const MARKER_STYLE_ACTIVE: React.CSSProperties = { zIndex: 100 }
const MARKER_STYLE_INACTIVE: React.CSSProperties = { zIndex: 1 }

export type PhotoLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    clusterRadius: number
    getImage: GetImageFunction
    iconLayout: ImageMarkerLayout
    iconSize: number
    iconSizeCluster?: number
    filter?: FilterSpecification
}

export const PhotoLayer: React.FC<PhotoLayerProps> = ({
    sourceId,
    layerId,
    sourceLayer,
    clusterRadius,
    getImage,
    iconLayout,
    iconSize,
    iconSizeCluster,
    filter,
}) => {
    const invisiblePointsLayer = `${layerId}-invisible-points`
    const dispatch = useDispatch()
    const { current } = useMap()
    const [activeImage, setActiveImage] = useState<string | number | null>(null)
    const features = useFeatures({
        sourceId,
        layerId: invisiblePointsLayer,
        map: current?.getMap(),
        filter,
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

    const renderPhoto = useCallback<RenderPhotoFunction>(
        (feature, isCluster) => {
            const [lng, lat] = feature.geometry.coordinates
            let id = feature.id as string | number // useFeatures hook makes sure feature has id

            if (isCluster) {
                const src = feature.properties?.src
                id = feature.properties?.cluster_id
                const clusterSize = feature.properties?.point_count

                return (
                    <Marker key={id} longitude={lng} latitude={lat}>
                        <ImageMarker
                            src={src}
                            size={iconSizeCluster ?? iconSize}
                            layout={iconLayout}
                            onHover={() => {
                                dispatch(
                                    actions.properties.set({
                                        values: feature.properties ?? {},
                                    }),
                                )
                            }}
                            onLeaveHover={() => {
                                dispatch(actions.properties.reset())
                            }}
                        >
                            <Badge top={-12} right={-12}>
                                {clusterSize}
                            </Badge>
                        </ImageMarker>
                    </Marker>
                )
            }

            const { src } = getImage(feature.properties)
            const active = activeImage === id

            return (
                <div key={id} style={PHOTO_CONTAINER_STYLE}>
                    <Marker
                        longitude={lng}
                        latitude={lat}
                        onClick={event => {
                            event.originalEvent.stopPropagation()

                            setActiveImage(id)
                        }}
                        style={active ? MARKER_STYLE_ACTIVE : MARKER_STYLE_INACTIVE}
                    >
                        <ImageMarker
                            src={src}
                            size={iconSize}
                            layout={iconLayout}
                            onHover={() => {
                                dispatch(
                                    actions.properties.set({
                                        values: feature.properties ?? {},
                                    }),
                                )
                            }}
                            onLeaveHover={() => {
                                dispatch(actions.properties.reset())
                            }}
                        />
                    </Marker>
                </div>
            )
        },
        [dispatch, iconSize, iconSizeCluster, iconLayout, getImage, activeImage],
    )

    return (
        <>
            <InvisibleCircleLayer
                layerId={invisiblePointsLayer}
                sourceId={sourceId}
                sourceLayer={sourceLayer}
                filter={filter}
            />
            <PhotoCluster
                radius={clusterRadius}
                data={
                    features.filter(f => {
                        const { src } = getImage(f.properties)
                        return !!src
                    }) as GeoJSON.Feature<GeoJSON.Point, { [key: string]: string | number }>[]
                }
                renderPhoto={renderPhoto}
                mapProperties={getImage}
            />
        </>
    )
}
