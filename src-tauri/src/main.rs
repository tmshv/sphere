#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod sphere;

use sphere::mbtiles::{Mbtiles, Tile};
use sphere::shape::Shapefile;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn mbtiles_get_metadata(path: &str) -> Result<String, String> {
    let mbtiles = Mbtiles { path: path.into() };
    let meta = mbtiles.get_metadata();
    match meta {
        Ok(meta) => Ok(meta),
        Err(err) => Err(format!("Failed to get metadata: {:?}", err)),
    }
}

#[tauri::command]
fn mbtiles_get_tile(path: &str, z: i32, x: i32, y: i32) -> Result<Vec<u8>, String> {
    let tile = Tile { x, y, zoom: z };
    let mbtiles = Mbtiles { path: path.into() };
    let data = mbtiles.get_tile(&tile);
    match data {
        Ok(data) => Ok(data),
        Err(err) => Err(format!("Failed to get tile {}/{}/{}: {:?}", z, x, y, err)),
    }
}

#[tauri::command]
fn shape_get_geojson(path: &str) -> Result<String, String> {
    let shp = Shapefile {
        path: String::from(path),
    };
    let data = shp.to_geojson();
    match data {
        Ok(data) => Ok(data),
        Err(err) => Err(format!("Failed read {} as GeoJSON: {:?}", path, err)),
    }
}

#[tauri::command]
fn geojson_get(path: &str) -> Result<String, String> {
    let geojson = sphere::geojson::Geojson {
        path: String::from(path),
    };
    let data = geojson.read();
    match data {
        Ok(data) => Ok(data),
        Err(err) => Err(format!("Failed read GeoJSON {}: {:?}", path, err)),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            geojson_get,
            mbtiles_get_tile,
            mbtiles_get_metadata,
            shape_get_geojson,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Application");
}

