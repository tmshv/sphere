#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod sphere;

use serde::Serialize;
use sphere::Bounds;
use tauri::State;
// use tokio::sync::mpsc;
use url::Url;

use sphere::mbtiles::Tile;
use sphere::source::{Source, SourceData};

use std::collections::HashMap;
use std::sync::Mutex;

// here we use Mutex to achieve interior mutability
#[derive(Default)]
struct SourceStorage {
    store: Mutex<HashMap<String, Source>>,
}

#[derive(Serialize, Debug)]
struct NewSource {
    id: String,
    name: String,
    location: String,
    source_type: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn mbtiles_get_metadata(id: String, storage: State<'_, SourceStorage>) -> Result<String, String> {
    let store = storage.store.lock().unwrap();
    let source = store.get(&id);
    match source {
        Some(source) => match &source.data {
            SourceData::Mbtiles(mbtiles) => {
                let meta = mbtiles.get_metadata();
                match meta {
                    Ok(meta) => Ok(meta),
                    Err(err) => Err(format!("Failed to get metadata: {:?}", err)),
                }
            }
            _ => Err("Source not found".into()),
        },
        None => Err("Source not found".into()),
    }
}

#[tauri::command]
async fn mbtiles_get_tile(
    id: String,
    z: i32,
    x: i32,
    y: i32,
    storage: State<'_, SourceStorage>,
) -> Result<Vec<u8>, String> {
    let store = storage.store.lock().unwrap();
    let source = store.get(&id);
    match source {
        Some(source) => match source.get_mbtiles() {
            Some(mbtiles) => {
                let tile = Tile { x, y, zoom: z };
                let data = mbtiles.get_tile(&tile);
                match data {
                    Ok(data) => Ok(data),
                    Err(err) => Err(format!("Failed to get tile {}/{}/{}: {:?}", z, x, y, err)),
                }
            }
            None => Err("Source is not MBTiles".into()),
        },
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
async fn source_get(id: String, storage: State<'_, SourceStorage>) -> Result<String, String> {
    let store = storage.store.lock().unwrap();
    let source = store.get(&id);
    match source {
        Some(source) => source.to_geojson(),
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
async fn source_add(source_url: &str, storage: State<'_, SourceStorage>) -> Result<NewSource, String> {
    let url = Url::parse(source_url).unwrap();
    println!("Adding Source: {}", url);

    match Source::from_url(url) {
        Ok(source) => {
            let n = NewSource {
                id: source.id.clone(),
                location: source.location.clone(),
                name: source.name.clone(),
                source_type: match &source.data {
                    SourceData::Geojson(_) => "geojson".into(),
                    SourceData::Mbtiles(_) => "mbtiles".into(),
                    SourceData::Shapefile(_) => "shapefile".into(),
                    SourceData::Csv(_) => "csv".into(),
                    SourceData::Gpx(_) => "gpx".into(),
                },
            };
            let id = source.id.clone();
            storage.store.lock().unwrap().insert(id, source);
            Ok(n)
        }
        Err(err) => Err(err),
    }
}

#[tauri::command]
async fn source_bounds(id: String, storage: State<'_, SourceStorage>) -> Result<(f64, f64, f64, f64), String> {
    let store = storage.store.lock().unwrap();
    match store.get(&id) {
        Some(source) => match source.get_bounds() {
            Some(bounds) => Ok(bounds),
            None => Err(format!("Cannot get bounds {}", &id)),
        },
        None => Err(format!("Not found {}", &id)),
    }
}

#[tokio::main]
async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    // let (async_proc_input_tx, async_proc_input_rx) = mpsc::channel(1);
    // let (async_proc_output_tx, mut async_proc_output_rx) = mpsc::channel(1);

    // tokio::spawn(async move {
    //     async_process(
    //         async_process_input_rx,
    //         async_process_output_tx,
    //     ).await
    // });

    tauri::Builder::default()
        .manage(SourceStorage {
            store: Default::default(),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            mbtiles_get_tile,
            mbtiles_get_metadata,
            source_add,
            source_get,
            source_bounds,
        ])
        // .setup(|app| {
        //     let app_handle = app.handle();
        //     tauri::async_runtime::spawn(async move {
        //         // A loop that takes output from the async process and sends it
        //         // to the webview via a Tauri Event
        //         loop {
        //             if let Some(output) = async_proc_output_rx.recv().await {
        //                 // rs2js(output, &app_handle);
        //             }
        //         }
        //     });
        //
        //     Ok(())
        // })
        .run(tauri::generate_context!())
        .expect("Error while running Application");
}
