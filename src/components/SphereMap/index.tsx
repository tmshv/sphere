// import { invoke } from "@tauri-apps/api/tauri";
import { listen } from '@tauri-apps/api/event'
import { readTextFile } from "@tauri-apps/api/fs"
import Map, { Layer, Source } from "react-map-gl";
import { useEffect, useState } from "react";

import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

export type SphereMapProps = {
    id: string
}

export const SphereMap: React.FC<SphereMapProps> = ({ id }) => {
    const [geojson, setGeojson] = useState<any>(null);
    // const [greetMsg, setGreetMsg] = useState("");

    // async function greet() {
    //   // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    //   setGreetMsg(await invoke("greet", { name }));
    // }


    // you can use tauri's listen function to register an event listener for the tauri://file-drop event.
    // There are also tauri://file-drop-hover and tauri://file-drop-cancelled.
    // They all trigger on the whole window, not on single html elements.So if you need that you have to keep track of the mouse position yourself(for example with mouseenter etc events).

    useEffect(() => {
        const e = "tauri://file-drop"
        // const e = "tauri://file-drop-hover"
        // const e = "tauri://file-drop-cancelled"
        console.log(`listen for ${e}`)
        listen(e, async (event) => {
            const files = event.payload as string[]
            const datas = await Promise.all(files.map(x => readTextFile(x)))

            const d = datas[0]

            try {
                const gis = JSON.parse(d)
                setGeojson(gis)
            } catch (error) {

            }
        })

        // const x = async () => {
        //     console.log(`listen for ${e}`)
        //     const unlisten = await listen(e, (event) => {
        //         console.log(e, event)
        //     })

        //     // listen to the `click` event and get a function to remove the event listener
        //     // there's also a `once` function that subscribes to an event and automatically unsubscribes the listener on the first event
        //     // event.event is the event name (useful if you want to use a single callback fn for multiple event types)
        //     // event.payload is the payload object
        // }
        // x()
    }, [])

    return (
        <Map
            id={id}
            trackResize
            initialViewState={{
                longitude: 30.31,
                latitude: 59.93,
                zoom: 12,
            }}
            mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
            mapStyle="mapbox://styles/mapbox/streets-v9"
        >
            {!geojson ? null : (
                <>
                    <Source
                        id={"geojson"}
                        data={geojson}
                        type={"geojson"}
                    />
                    <Layer
                        id={"geojson-fill"}
                        source={"geojson"}
                        type={"fill"}
                        paint={{
                            "fill-color": "lime",
                        }}
                    />
                </>
            )}
        </Map>
    );
}
