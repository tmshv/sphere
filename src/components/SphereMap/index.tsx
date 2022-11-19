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
import { LayerType, SourceType } from "@/types";
import { Fragment } from "react";
import { SetupStore } from "./SetupStore";
import { HandleClick } from "./HandleClick";
import { PolygonLayer } from "./PolygonLayer";
import { LineStringLayer } from "./LineStringLayer";
import { PointLayer } from "./PointLayer";

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

export type SphereMapProps = {
    id: string
}

export const SphereMap: React.FC<SphereMapProps> = ({ id }) => {
    const projection = useAppSelector(selectProjection)
    const mapStyle = useAppSelector(selectMapStyle)
    const showFog = useAppSelector(selectIsShowFog)
    const showTerrain = useAppSelector(selectIsShowTerrain)
    const sourceIds = useAppSelector(state => state.source.allIds)
    const layers = useAppSelector(state => state.layer.allIds.map(id => {
        const { sourceId, type } = state.layer.items[id]

        return {
            id,
            sourceId,
            type,
        }
    }))

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
            logoPosition={"bottom-right"}
        >
            <SetupStore
                mapId={id}
            />
            <HandleClick
                mapId={id}
            />
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

            {sourceIds.map(sourceId => (
                <SphereSource
                    key={sourceId}
                    mapId={id}
                    id={sourceId}
                />
            ))}
            {layers.map(({ id, sourceId, type }) => {
                return (
                    <Fragment key={id}>
                        {!(type === LayerType.Polygon) ? null : (
                            <PolygonLayer
                                sourceId={sourceId}
                            />
                        )}
                        {!(type === LayerType.Line) ? null : (
                            <LineStringLayer
                                sourceId={sourceId}
                            />
                        )}
                        {!(type === LayerType.Point) ? null : (
                            <PointLayer
                                sourceId={sourceId}
                            />
                        )}
                    </Fragment>
                )
            })}
        </Map>
    );
}
