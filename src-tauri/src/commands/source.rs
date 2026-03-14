use libsphere::schema::SourceSchema;
use libsphere::source::{Source, SourceData};
use libsphere::Bounds;
use mbtiles::tile::Tile;
use serde::Serialize;
use tauri::State;
use url::Url;

use crate::state::SourceStorage;

#[derive(Serialize, Debug)]
pub struct NewSource {
    id: String,
    name: String,
    location: String,
    source_type: String,
}

#[tauri::command]
pub async fn source_add(source_url: &str, storage: State<'_, SourceStorage>) -> Result<NewSource, String> {
    let url = Url::parse(source_url).map_err(|e| e.to_string())?;
    println!("Adding Source: {}", url);

    match Source::from_url(url) {
        Ok(source) => {
            let n = NewSource {
                id: source.id.clone(),
                location: source.location.clone(),
                name: source.name.clone(),
                source_type: match &source.data {
                    SourceData::Geojson(_) => "geojson".into(),
                    SourceData::GeojsonSeq(_) => "geojson".into(),
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
pub async fn source_get(id: String, storage: State<'_, SourceStorage>) -> Result<String, String> {
    let store = storage.store.lock().unwrap();
    let source = store.get(&id);
    match source {
        Some(source) => source.to_geojson(),
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
pub async fn source_get_schema(
    id: String,
    storage: State<'_, SourceStorage>,
) -> Result<SourceSchema, String> {
    let store = storage.store.lock().unwrap();
    let source = store.get(&id);
    match source {
        Some(source) => source.get_schema(),
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
pub async fn source_bounds(id: String, storage: State<'_, SourceStorage>) -> Result<(f64, f64, f64, f64), String> {
    let store = storage.store.lock().unwrap();
    match store.get(&id) {
        Some(source) => match source.get_bounds() {
            Some(bounds) => Ok(bounds),
            None => Err(format!("Cannot get bounds {}", &id)),
        },
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
pub async fn mbtiles_get_metadata(id: String, storage: State<'_, SourceStorage>) -> Result<String, String> {
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
pub async fn mbtiles_get_tile(
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
