#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod sphere;
use sphere::mbtiles::{mbtiles_read_metadata, mbtiles_read_tile, Tile};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn mbtiles_get_metadata(path: &str) -> String {
    let meta = mbtiles_read_metadata(path);
    println!("mbtile meta was invoked from js with result: {:?}", meta);

    meta
}

#[tauri::command]
fn mbtiles_get_tile(path: &str, z: i32, x: i32, y: i32) -> Vec<u8> {
    let tile = Tile { x, y, zoom: z };
    let pbf = mbtiles_read_tile(path, &tile);
    println!("Tile: {:?}", pbf);

    match pbf {
        Some(tile) => tile,
        None => vec![],
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            mbtiles_get_tile,
            mbtiles_get_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
