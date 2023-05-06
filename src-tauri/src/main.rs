#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod sphere;
use sphere::mbtiles::mbtiles_read_metadata;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn mbtiles_get_metadata(path: &str) -> String {
    let meta = mbtiles_read_metadata(path);
    println!("mbtile meta was invoked from js with result: {:?}", meta);

    meta
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![mbtiles_get_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
