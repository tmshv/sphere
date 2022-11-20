import { ClustersOptions, useClusters } from '@/hooks/useClusters'
import { useAppSelector } from '@/store/hooks'
import { Dataset } from '@/types'
import { ImageMarker } from '@/ui/ImageMarker'
import { createStyles } from '@mantine/core'
import { point } from '@turf/helpers'
import { useCallback, useMemo } from 'react'
import { Marker } from 'react-map-gl'

//badge

const useStyle = createStyles(theme => ({
    badge: {
        backgroundColor: theme.white,
        padding: "0 5px",
        borderRadius: 50,
        color: theme.black,
        fontSize: 12,
        minWidth: 20,
        textAlign: "center",
        transform: "translate(50 %, -50 %)",
        boxShadow: "0px 0px 3px rgba(0, 0, 20, 0.1)",
    },
}))

export type BadgeProps = {
    top?: number
    right?: number
    children?: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({ top, right, children }) => {
    const { classes: s } = useStyle()
    return (
        <div
            className={s.badge}
            style={{
                position: 'absolute',
                top: top ?? 0,
                right: right ?? 0,
            }}
        >
            {children}
        </div>
    )
}

// layer

export type GetImageFunction = (p: Record<string, any>) => {
    src: string,
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

export const PhotoLayer: React.FC<PhotoLayerProps> = ({ sourceId, clusterRadius, getImage, iconSize, iconSizeCluster }) => {
    const features = useAppSelector(state => {
        const source = state.source.items[sourceId].dataset as Dataset<GeoJSON.Point>
        return source.data
            .filter(f => {
                const { src } = getImage(f.data)
                return !!src
            })
            .map(f => {
                return point(f.geometry!.coordinates, f.data)
            })
    })

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
                        layout={'circle'}
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

        const { src } = getImage(feature.properties!)

        return (
            <div key={id} style={{ position: 'relative', zIndex: 0, }}>
                <Marker
                    longitude={lng} latitude={lat}
                >
                    <ImageMarker
                        src={src}
                        size={iconSize}
                        layout={'circle'}
                    />
                </Marker>
            </div>
        )
    }, [iconSize, getImage])

    return (
        <PhotoCluster
            radius={clusterRadius}
            data={features}
            renderPhoto={renderPhoto}
            mapProperties={p => {
                const { src, value } = getImage(p)
                return {
                    value,
                    url: src ?? '',
                }
            }}
        />
    )
}

type RenderPhotoFunction = (feature: GeoJSON.Feature<GeoJSON.Point>, isCluster: boolean) => React.ReactNode
type MapPropertiesFunction = (properties: Record<string, any>) => { url: string, value: number }
type PhotoClusterProps = {
    radius: number
    data: GeoJSON.Feature<GeoJSON.Point, any>[]
    mapProperties: MapPropertiesFunction
    renderPhoto: RenderPhotoFunction
}

const PhotoCluster: React.FC<PhotoClusterProps> = ({ radius, data, mapProperties, renderPhoto }) => {
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
    const { clusters } = useClusters<Props, Props>("spheremap", data, 'moveend', options)

    return (
        <>
            {clusters.map(cluster => {
                if (cluster.properties?.cluster) {
                    return renderPhoto(cluster, true)
                }

                return renderPhoto(cluster, false)
            })}
        </>
    )
}
