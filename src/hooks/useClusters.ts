import type { Feature, Point, BBox } from 'geojson'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMap } from 'react-map-gl'
import Supercluster from 'supercluster'
import { useMapboxEvent } from './useMapboxEvent'

type DefaultFeatureProperties = {
    [key: string]: any
}
export type ClustersOptions<P extends Supercluster.AnyProps, C> = Supercluster.Options<P, C>
export function useClusters<
    P extends Supercluster.AnyProps = DefaultFeatureProperties,
    C extends Supercluster.AnyProps = DefaultFeatureProperties
>(mapId: string, data: Feature<Point, P>[], eventName: string, options: ClustersOptions<P, C>) {
    type Clusters = Array<Supercluster.PointFeature<P> | Supercluster.ClusterFeature<C>>

    const { [mapId]: ref } = useMap()
    const map = ref?.getMap()!

    const [clusters, setClusters] = useState<Clusters>([])
    const cluster = useRef<Supercluster<P, C>>(new Supercluster<P, C>(options))

    useEffect(() => {
        cluster.current = new Supercluster<P, C>(options)
    }, [options])

    const update = useCallback(() => {
        const zoom = map.getZoom()
        const bounds = map.getBounds() // sw ne
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as BBox
        let clusters = cluster.current.getClusters(bbox, Math.floor(zoom)) // w s e n
        setClusters(clusters)
    }, [map])

    useEffect(() => {
        cluster.current.load(data)
        update()
    }, [data, update])

    useMapboxEvent(eventName, update)

    return ({
        clusters,
        supercluster: cluster.current,
    })
}