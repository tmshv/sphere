// import { invoke } from "@tauri-apps/api/tauri";
import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Layer } from "react-map-gl";
import { useAppSelector } from "../../store/hooks";
import { selectProjection } from "../../store/projection";
import { selectMapStyle } from "../../store/mapStyle";
import { Terrain } from "./Terrain";
import { Fog } from "./Fog";
import { selectIsShowFog } from "../../store/fog";
import { selectIsShowTerrain } from "../../store/terrain";
import { SphereSource } from "./SphereSource";
import { SourceType } from "../../types";
import { Fragment } from "react";
import { CirclePaint, FillPaint, LinePaint } from "mapbox-gl";

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

const circlePaint: CirclePaint = {
    "circle-color": "#227FF8",
    "circle-radius": 4,
    "circle-stroke-color": "white",
    "circle-stroke-width": 1,
}
const fillPaint: FillPaint = {
    "fill-color": "#227FF8",
    "fill-opacity": 0.25,
}
const outlinePaint0: LinePaint = {
    "line-color": "white",
    "line-width": 3,
}
const outlinePaint1: LinePaint = {
    "line-color": "#227FF8",
    "line-width": 1,
}
const linePaint0: LinePaint = {
    "line-color": "white",
    "line-width": 3,
}
const linePaint1: LinePaint = {
    "line-color": "#227FF8",
    "line-width": 1,
    "line-dasharray": [2, 3],
}

export type SphereMapProps = {
    id: string
}

export const SphereMap: React.FC<SphereMapProps> = ({ id }) => {
    const projection = useAppSelector(selectProjection)
    const mapStyle = useAppSelector(selectMapStyle)
    const showFog = useAppSelector(selectIsShowFog)
    const showTerrain = useAppSelector(selectIsShowTerrain)
    const sourceIdWithType = useAppSelector(
        state => state.source.allIds.map(id => [id, state.source.items[id].type])
    ) as [string, SourceType][]

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
            projection={projection}
        >
            {!showFog ? null : (
                <Fog
                    mapId={id}
                />
            )}
            {!showTerrain ? null : (
                <Terrain
                    mapId={id}
                />
            )}
            <Layer
                id="sky"
                type="sky"
                paint={{
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 65.0],
                    'sky-atmosphere-sun-intensity': 15
                }}
            />

            {sourceIdWithType.map(([sourceId, type]) => {
                return (
                    <Fragment key={sourceId}>
                        <SphereSource
                            mapId={id}
                            id={sourceId}
                        />
                        {!(type === SourceType.Polygons) ? null : (
                            <>
                                <Layer
                                    id={`${sourceId}-polygons-fill`}
                                    source={sourceId}
                                    type={"fill"}
                                    paint={fillPaint}
                                />
                                <Layer
                                    id={`${sourceId}-polygons-outline-0`}
                                    source={sourceId}
                                    type={"line"}
                                    paint={outlinePaint0}
                                />
                                <Layer
                                    id={`${sourceId}-polygons-outline-1`}
                                    source={sourceId}
                                    type={"line"}
                                    paint={outlinePaint1}
                                />
                            </>
                        )}
                        {!(type === SourceType.Lines) ? null : (
                            <>
                                <Layer
                                    id={`${sourceId}-lines-0`}
                                    source={sourceId}
                                    type={"line"}
                                    paint={linePaint0}
                                />
                                <Layer
                                    id={`${sourceId}-lines-1`}
                                    source={sourceId}
                                    type={"line"}
                                    paint={linePaint1}
                                />
                            </>
                        )}
                        {!(type === SourceType.Points) ? null : (
                            <Layer
                                id={`${sourceId}-circles`}
                                source={sourceId}
                                type={"circle"}
                                paint={circlePaint}
                            />
                        )}
                    </Fragment>
                )
            })}
        </Map>
    );
}
