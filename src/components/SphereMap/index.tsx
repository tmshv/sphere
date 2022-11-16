// import { invoke } from "@tauri-apps/api/tauri";
import Map, { Layer, Source, useMap } from "react-map-gl";
import { useContext, useEffect, useMemo } from "react";
import { AppStateContext } from '../../state';
import { useSelector } from '@xstate/react';
import * as turf from "@turf/helpers"

import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

function mapStyleSelector(state: any) {
    return state.matches("vector")
        ? "mapbox://styles/mapbox/streets-v9"
        : "mapbox://styles/mapbox/satellite-streets-v11"
}

const pointType = new Set(["Point", "MultiPoint"])
const lineType = new Set(["LineString", "MultiLineStreing"])
const polygonType = new Set(["Polygon", "MultiPolygon"])

export type SphereMapProps = {
    id: string
    data: GeoJSON.FeatureCollection | null
}

export const SphereMap: React.FC<SphereMapProps> = ({ id, data }) => {
    const state = useContext(AppStateContext);
    const mapStyle = useSelector(state.mapStyle, mapStyleSelector);
    const { [id]: ref } = useMap()

    const [points, lines, polygons] = useMemo(() => {
        if (!data) {
            return [
                turf.featureCollection([]) as GeoJSON.FeatureCollection,
                turf.featureCollection([]) as GeoJSON.FeatureCollection,
                turf.featureCollection([]) as GeoJSON.FeatureCollection,
            ]
        }

        const points = data["features"]
            .filter(f => pointType.has(f.geometry.type))
        const lines = data["features"]
            .filter(f => lineType.has(f.geometry.type))
        const polygons = data["features"]
            .filter(f => polygonType.has(f.geometry.type))

        return [
            turf.featureCollection(points) as GeoJSON.FeatureCollection,
            turf.featureCollection(lines) as GeoJSON.FeatureCollection,
            turf.featureCollection(polygons) as GeoJSON.FeatureCollection,
        ]
    }, [data])

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }
        const cb = () => {
            map.setFog({});
        }

        map.on('load', cb)
        if (map.isStyleLoaded()) {
            map.setFog({});
        }

        return () => {
            map.off('load', cb)
        }
    }, [ref, mapStyle])



    // async function greet() {
    //   // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    //   setGreetMsg(await invoke("greet", { name }));
    // }

    // you can use tauri's listen function to register an event listener for the tauri://file-drop event.
    // There are also tauri://file-drop-hover and tauri://file-drop-cancelled.
    // They all trigger on the whole window, not on single html elements.So if you need that you have to keep track of the mouse position yourself(for example with mouseenter etc events).

    return (
        <Map
            id={id}
            trackResize
            initialViewState={{
                longitude: 26.351821433680755,
                latitude: 30.0194833642568,
                zoom: 1.76,
                pitch: 0,
                bearing: 0,
            }}
            maxPitch={85}
            mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
            mapStyle={mapStyle}
            projection={'globe'}
        >
            {!polygons ? null : (
                <>
                    <Source
                        id={"geojson-polygons"}
                        data={polygons}
                        type={"geojson"}
                    />
                    <Layer
                        id={"geojson-polygons-fill"}
                        source={"geojson-polygons"}
                        type={"fill"}
                        paint={{
                            "fill-color": "#227FF8",
                            "fill-opacity": 0.25,
                        }}
                    />
                    <Layer
                        id={"geojson-polygons-outline-0"}
                        source={"geojson-polygons"}
                        type={"line"}
                        paint={{
                            "line-color": "white",
                            "line-width": 3,
                        }}
                    />
                    <Layer
                        id={"geojson-polygons-outline-1"}
                        source={"geojson-polygons"}
                        type={"line"}
                        paint={{
                            "line-color": "#227FF8",
                            "line-width": 1,
                        }}
                    />
                </>
            )}
            {!lines ? null : (
                <>
                    <Source
                        id={"geojson-lines"}
                        data={lines}
                        type={"geojson"}
                    />
                    <Layer
                        id={"geojson-lines-0"}
                        source={"geojson-lines"}
                        type={"line"}
                        paint={{
                            "line-color": "white",
                            "line-width": 3,
                        }}
                    />
                    <Layer
                        id={"geojson-lines-1"}
                        source={"geojson-lines"}
                        type={"line"}
                        paint={{
                            "line-color": "#227FF8",
                            "line-width": 1,
                            "line-dasharray": [2, 3],
                        }}
                    />
                </>
            )}
            {!points ? null : (
                <>
                    <Source
                        id={"geojson-points"}
                        data={points}
                        type={"geojson"}
                    />
                    <Layer
                        id={"geojson-circle"}
                        source={"geojson-points"}
                        type={"circle"}
                        paint={{
                            "circle-color": "#227FF8",
                            "circle-radius": 4,
                            "circle-stroke-color": "white",
                            "circle-stroke-width": 1,
                        }}
                    />
                </>
            )}
        </Map>
    );
}
