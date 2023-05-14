#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod sphere;

use serde::Serialize;
use sphere::Bounds;
use tauri::State;
use url::Url;

use sphere::mbtiles::Tile;
use sphere::source::{Source, SourceData};

use std::collections::HashMap;
use std::str::FromStr;
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
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn mbtiles_get_metadata(id: String, storage: State<SourceStorage>) -> Result<String, String> {
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
fn mbtiles_get_tile(
    id: String,
    z: i32,
    x: i32,
    y: i32,
    storage: State<SourceStorage>,
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
fn source_get(id: String, storage: State<SourceStorage>) -> Result<String, String> {
    let store = storage.store.lock().unwrap();
    let source = store.get(&id);
    match source {
        Some(source) => {
            source.to_geojson()
        }
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
fn source_add(source_url: &str, storage: State<SourceStorage>) -> Result<NewSource, String> {
    let url = Url::parse(source_url).unwrap();
    println!("Adding Source: {}", url);

    match Source::from_url(url) {
        Ok(source) => {
            let n = NewSource {
                id: source.id.clone(),
                location: source.location.clone(),
                name: source.name.clone(),
            };
            let id = source.id.clone();
            storage.store.lock().unwrap().insert(id, source);
            Ok(n)
        }
        Err(_) => Err(String::from("No Add!")),
    }
}

#[tauri::command]
fn source_bounds(id: String, storage: State<SourceStorage>) -> Result<String, String> {
    let store = storage.store.lock().unwrap();
    let val = store.get(&id);
    match val {
        Some(val) => {
            println!("Found! {:?}", val.get_bounds());
            Ok("Found!".to_string())
        }
        None => Err(format!("Not found {}", &id)),
    }
}

fn main() {
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
        .run(tauri::generate_context!())
        .expect("Error while running Application");
}
