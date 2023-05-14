#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod sphere;

use sphere::Bounds;
use tauri::State;
use url::Url;

use sphere::geojson::Geojson;
use sphere::mbtiles::{Mbtiles, Tile};
use sphere::shape::Shapefile;

use std::collections::HashMap;
use std::path::Path;
use std::str::FromStr;
use std::sync::Mutex;

#[derive(Debug)]
enum Source {
    Geojson(Geojson),
    Shapefile(Shapefile),
    // Gpx,
    // Csv,
    Mbtiles(Mbtiles),
    // Pmtiles,
}

impl Bounds for Source {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)> {
        match self {
            Source::Shapefile(shp) => shp.get_bounds(),
            _ => None,
        }
    }
}

impl Source {
    fn from_url(source_url: Url) -> Result<Self, String> {
        let scheme = source_url.scheme();
        match scheme {
            "sphere" => {
                println!(
                    "Found Sphere source. Will load {} from FS",
                    &source_url.domain().unwrap()
                );
            }
            "http" => {
                println!("Found HTTP source. Will load remote {}", &source_url);
            }
            "https" => {
                println!("Found HTTPS source. Will load remote {}", &source_url);
            }
            _ => {
                return Err(format!("Cannot handle scheme {}", scheme));
            }
        }

        // Get the query parameters (e.g. "foo=bar")
        // let query_pairs = url.query_pairs();
        // for (name, value) in query_pairs {
        //     println!("Query parameter - Name: {}, Value: {}", name, value);
        // }

        let path = source_url.path();
        let source_path = path.to_string();
        let path = Path::new(path);
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        match ext {
            "shp" => {
                let source = Shapefile {
                    path: source_path,
                };
                Ok(Source::Shapefile(source))
            }
            "geojson" => {
                let source = Geojson {
                    path: source_path,
                };
                Ok(Source::Geojson(source))
            }
            "mbtiles" => {
                let source = Mbtiles {
                    path: source_path,
                };
                Ok(Source::Mbtiles(source))
            }
            _ => Err(format!("Cannot handle extension {}", ext)),
        }
    }
}

// here we use Mutex to achieve interior mutability
#[derive(Default)]
struct SourceStorage {
    store: Mutex<HashMap<String, Source>>,
}

// Declare global map variable with key type String and value type MyStruct
// lazy_static! {
//     static ref STORE: std::sync::RwLock<HashMap<String, Source>> =
//         std::sync::RwLock::new(HashMap::new());
// }

// struct Source {
//     path: String,
//     source_type: SourceType,
// }

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
fn shape_get_geojson(path: &str, storage: State<SourceStorage>) -> Result<String, String> {
    let key = String::from_str(path).unwrap();
    let store = storage.store.lock().unwrap();
    let val = store.get(&key);
    match val {
        Some(val) => {
            println!("Found! {:?}", val);
            let shp = Shapefile {
                path: String::from(path),
            };
            let data = shp.to_geojson();
            match data {
                Ok(data) => Ok(data),
                Err(err) => Err(format!("Failed read {} as GeoJSON: {:?}", path, err)),
            }
        }
        None => Err(format!("Not found {}", path)),
    }
}

#[tauri::command]
fn source_add(source_url: &str, storage: State<SourceStorage>) -> Result<String, String> {
    let key = String::from_str(source_url).unwrap();
    let url = Url::parse(source_url).unwrap();
    println!("Adding Source: {}", url);

    match Source::from_url(url) {
        Ok(source) => {
            let src = storage.store.lock().unwrap().insert(key, source);
            Ok(String::from("Add!"))
        }
        Err(_) => Err(String::from("No Add!")),
    }
}

#[tauri::command]
fn source_bounds(source_path: &str, storage: State<SourceStorage>) -> Result<String, String> {
    let key = String::from_str(source_path).unwrap();
    let store = storage.store.lock().unwrap();
    let val = store.get(&key);
    match val {
        Some(val) => {
            println!("Found! {:?}", val.get_bounds());
            Ok("Found!".to_string())
        }
        None => Err(format!("Not found {}", source_path)),
    }
}

#[tauri::command]
fn geojson_get(path: &str) -> Result<String, String> {
    let geojson = Geojson {
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
        .manage(SourceStorage {
            store: Default::default(),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            geojson_get,
            mbtiles_get_tile,
            mbtiles_get_metadata,
            shape_get_geojson,
            source_add,
            source_bounds,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Application");
}
