// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import Map, { MapLayerMouseEvent, useMap } from "react-map-gl";
import { Statusbar } from "./ui/Statusbar";
import { useCallback, useEffect, useState } from "react";

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

function round(value: number, n: number): number {
    return Math.round(value * n) / n
}

function App() {
    const [[lng, lat], setCursor] = useState<[number, number]>([0, 0]);
    // const [greetMsg, setGreetMsg] = useState("");
    // const [name, setName] = useState("");

    // async function greet() {
    //   // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    //   setGreetMsg(await invoke("greet", { name }));
    // }

    const { map } = useMap()

    useEffect(() => {
        if (!map) {
            return
        }

        const x = map.getMap()

        console.log(x, x.getBearing())
    }, [map])

    const move = useCallback<(event: MapLayerMouseEvent) => void>(event => {
        setCursor([event.lngLat.lng, event.lngLat.lat])
    }, [])

    return (
        <div className="container">
            <div className="map">
                <Map
                    id={"map"}
                    trackResize
                    initialViewState={{
                        longitude: -122.4,
                        latitude: 37.8,
                        zoom: 14
                    }}
                    mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
                    mapStyle="mapbox://styles/mapbox/streets-v9"
                    onMouseMove={move}
                />
            </div>

            <Statusbar>
                lng={round(lng, 1000000)}
                ;
                lat={round(lat, 1000000)}
            </Statusbar>
        </div>
    );
}

export default App;
