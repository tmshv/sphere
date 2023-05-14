#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod sphere;

use lazy_static::lazy_static;
use sphere::Bounds;
use url::{ParseError, Url};

use sphere::geojson::Geojson;
use sphere::mbtiles::{Mbtiles, Tile};
use sphere::shape::Shapefile;

use std::collections::HashMap;
use std::path::Path;
use std::str::FromStr;

#[derive(Debug)]
enum Source {
    Geojson(Geojson),
    Shapefile(Shapefile),
    // Gpx,
    // Csv,
    // Mbtiles,
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

// Declare global map variable with key type String and value type MyStruct
lazy_static! {
    static ref STORE: std::sync::RwLock<HashMap<String, Source>> =
        std::sync::RwLock::new(HashMap::new());
}

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
fn shape_get_geojson(path: &str) -> Result<String, String> {
    match STORE.read() {
        Ok(store) => {
            let key = String::from_str(path).unwrap();
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
        Err(err) => Err(format!("Failed read {} as GeoJSON: {:?}", path, err)),
    }
}

fn uparse(source_url: &str) {
    let url = Url::parse(source_url).unwrap();

    // Get the scheme (e.g. "https")
    let scheme = url.scheme();
    println!("Scheme: {}", scheme);

    // Get the path (e.g. "/path/to/file.txt")
    let path_str = url.path();
    let path = Path::new(path_str);
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    println!("Path: {}, Extension: {}", path_str, ext);

    match scheme {
        "sphere" => {
            println!("Found Sphere source. Will load from FS {:?}", url.domain());
        }
        "http" => {
            println!("Found HTTP source. Will load remote {}", url);
        }
        "https" => {
            println!("Found HTTPS source. Will load remote {}", url);
        }
        _ => {
            println!("Cannot handle scheme {}", scheme);
        }
    }

    // Get the query parameters (e.g. "foo=bar")
    let query_pairs = url.query_pairs();
    for (name, value) in query_pairs {
        println!("Query parameter - Name: {}, Value: {}", name, value);
    }
}

#[tauri::command]
fn source_add(source_url: &str) -> Result<String, String> {
    match STORE.write() {
        Ok(mut store) => {
            let key = String::from_str(source_url).unwrap();
            let url = Url::parse(source_url).unwrap();
            println!("Adding Source: {}", url);
            // uparse(format!("sphere://source{}", source_url).as_str());
            let p = Path::new(url.path());
            let src = match p.extension() {
                Some(ext) => {
                    let ext_str = ext.to_str().unwrap();
                    // .to_lowercase();
                    match ext_str {
                        "shp" => {
                            let shp = Shapefile {
                                path: String::from(p.to_str().unwrap()),
                            };
                            Some(Source::Shapefile(shp))
                        }
                        _ => {
                            println!("Source {} is not yet implemented!", ext_str);
                            None
                        }
                    }
                }
                None => {
                    println!("No extension found.");
                    None
                }
            };

            match src {
                Some(src) => {
                    store.insert(key, src);
                    Ok(String::from("Add!"))
                }
                None => Err(String::from("No Add!")),
            }
        }
        Err(_) => Err(format!("Failed to create Shape source at {}", source_url)),
    }
}

#[tauri::command]
fn source_bounds(source_path: &str) -> Result<String, String> {
    match STORE.read() {
        Ok(store) => {
            let key = String::from_str(source_path).unwrap();
            let val = store.get(&key);
            match val {
                Some(val) => {
                    println!("Found! {:?}", val.get_bounds());
                    Ok("Found!".to_string())
                }
                None => Err(format!("Not found {}", source_path)),
            }
        }
        Err(err) => Err(format!("Failed read {} as GeoJSON: {:?}", source_path, err)),
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
