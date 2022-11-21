# Sphere

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## TODO

- Unknown Geometry Dataset
- Edit source name
- Images layer
- Text layer
- Heatmap layer
- Multiselect
- Hexagon Layer
- Arrows Layer
- Arcs Layer
- Pins Layer
- UI
- From URL
- GPX layer
- KML
- WKT
- Table view
- Tool: measure
- Tool: smooth polygon / line
- Tool: dbscan
- Tool: merge / explode features
- Tool: sample points in polygon
- Tool: Polygon -> LineString
- Tool: LineString -> Polygon
- Tool: Isochrone
- Layer Order
- Draw
- Free Draw
- Overpass
- PostGIS
- Save User Settings
- Save Work
- Print Image
- Export

## Done

- Edit layer 
- Geojson -> Dataset
- Add layer manually
- Show/Hide Layers
- Split source/layer
- CSV

// module.exports = [
//   {
//     title: 'Streets',
//     style: 'mapbox://styles/mapbox/streets-v11'
//   },
//   {
//     title: 'Satellite Streets',
//     style: 'mapbox://styles/mapbox/satellite-streets-v11'
//   },
//   {
//     title: 'Outdoors',
//     style: 'mapbox://styles/mapbox/outdoors-v11'
//   },
//   {
//     title: 'Light',
//     style: 'mapbox://styles/mapbox/light-v10'
//   },
//   {
//     title: 'Dark',
//     style: 'mapbox://styles/mapbox/dark-v10'
//   },
// ];



// import { open } from '@tauri-apps/api/dialog';
// import { appDir } from '@tauri-apps/api/path';
// // Open a selection dialog for directories
// const selected = await open({
//   directory: true,
//   multiple: true,
//   defaultPath: await appDir(),
// });
// if (Array.isArray(selected)) {
//   // user selected multiple directories
// } else if (selected === null) {
//   // user cancelled the selection
// } else {
//   // user selected a single directory
// }


// import { invoke } from "@tauri-apps/api/tauri";
// async function greet() {
//   // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
//   setGreetMsg(await invoke("greet", { name }));
// }
// you can use tauri's listen function to register an event listener for the tauri://file-drop event.
// There are also tauri://file-drop-hover and tauri://file-drop-cancelled.
// They all trigger on the whole window, not on single html elements.So if you need that you have to keep track of the mouse position yourself(for example with mouseenter etc events).
