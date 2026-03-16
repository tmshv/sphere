use libsphere::FeatureStore;
use libsphere::Bounds;
use libsphere::PageResult;
use libsphere::schema::SourceSchema;
use libsphere::source::{Source, SourceData};
use mbtiles::tile::Tile;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use tauri::State;
use url::Url;

use crate::state::{SourceEntry, SourceStorage};

#[derive(Serialize, Debug)]
pub struct SourceAddResult {
    id: String,
    name: String,
    location: String,
    source_type: String,
}

#[derive(Serialize, Debug)]
pub struct HistogramBin {
    pub min: f64,
    pub max: f64,
    pub count: u64,
}

#[derive(Serialize, Debug)]
pub struct ColumnStats {
    pub column: String,
    pub col_type: String,
    pub count: u64,
    pub null_count: u64,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub mean: Option<f64>,
    pub histogram: Option<Vec<HistogramBin>>,
    pub unique_count: Option<u64>,
    pub top_values: Option<Vec<(String, u64)>>,
}

fn build_feature_store(source: &Source) -> Option<FeatureStore> {
    match source.to_feature_collection() {
        Ok(fc) => Some(FeatureStore::from_features(fc.features)),
        Err(e) => {
            println!("Warning: failed to build feature store: {}", e);
            None
        }
    }
}

fn build_histogram(values: &[f64], min: f64, max: f64, bins: usize) -> Vec<HistogramBin> {
    if min == max {
        return vec![HistogramBin { min, max, count: values.len() as u64 }];
    }
    let bin_size = (max - min) / bins as f64;
    let mut counts = vec![0u64; bins];
    for &v in values {
        let idx = ((v - min) / bin_size) as usize;
        let idx = idx.min(bins - 1);
        counts[idx] += 1;
    }
    counts.into_iter().enumerate().map(|(i, count)| HistogramBin {
        min: min + i as f64 * bin_size,
        max: min + (i + 1) as f64 * bin_size,
        count,
    }).collect()
}

#[tauri::command]
pub async fn source_add(source_url: &str, storage: State<'_, SourceStorage>) -> Result<SourceAddResult, String> {
    let url = Url::parse(source_url).map_err(|e| e.to_string())?;
    println!("Adding Source: {}", url);

    match Source::from_url(url) {
        Ok(source) => {
            let n = SourceAddResult {
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
            let store = match &source.data {
                SourceData::Mbtiles(_) => None,
                _ => build_feature_store(&source),
            };
            let entry = SourceEntry { source, store };
            storage.store.lock().unwrap().insert(id, entry);
            Ok(n)
        }
        Err(err) => Err(err),
    }
}

#[tauri::command]
pub async fn source_get(id: String, storage: State<'_, SourceStorage>) -> Result<String, String> {
    let store = storage.store.lock().unwrap();
    match store.get(&id) {
        Some(entry) => entry.source.to_geojson(),
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
pub async fn source_get_schema(id: String, storage: State<'_, SourceStorage>) -> Result<SourceSchema, String> {
    let store = storage.store.lock().unwrap();
    match store.get(&id) {
        Some(entry) => entry.source.get_schema(),
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
pub async fn source_bounds(id: String, storage: State<'_, SourceStorage>) -> Result<(f64, f64, f64, f64), String> {
    let store = storage.store.lock().unwrap();
    match store.get(&id) {
        Some(entry) => match entry.source.get_bounds() {
            Some(bounds) => Ok(bounds),
            None => Err(format!("Cannot get bounds {}", &id)),
        },
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
pub async fn mbtiles_get_metadata(id: String, storage: State<'_, SourceStorage>) -> Result<String, String> {
    let store = storage.store.lock().unwrap();
    match store.get(&id) {
        Some(entry) => match &entry.source.data {
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
    match store.get(&id) {
        Some(entry) => match entry.source.get_mbtiles() {
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
pub async fn source_query_page(
    id: String,
    offset: u64,
    limit: u64,
    sort_column: Option<String>,
    sort_asc: Option<bool>,
    filter_json: Option<String>,
    storage: State<'_, SourceStorage>,
) -> Result<PageResult, String> {
    let filter = match &filter_json {
        None => None,
        Some(json_str) => {
            let json_val: Value = serde_json::from_str(json_str).map_err(|e| e.to_string())?;
            Some(libexpression::parse(json_val).map_err(|e| e.to_string())?)
        }
    };

    let store = storage.store.lock().unwrap();
    let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
    let fs = entry.store.as_ref().ok_or_else(|| "No feature store for this source".to_string())?;

    let result = fs.query_page(
        offset,
        limit,
        filter.as_ref(),
        sort_column.as_deref(),
        sort_asc.unwrap_or(true),
    );

    Ok(result)
}

#[tauri::command]
pub async fn source_get_column_stats(
    id: String,
    column: String,
    storage: State<'_, SourceStorage>,
) -> Result<ColumnStats, String> {
    let store = storage.store.lock().unwrap();
    let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
    let fs = entry.store.as_ref().ok_or_else(|| "No feature store for this source".to_string())?;

    let col_type = fs.schema().columns.get(&column)
        .cloned()
        .ok_or_else(|| format!("Column '{}' not found in source '{}'", column, id))?;
    let features = fs.features();

    let mut count = 0u64;
    let mut null_count = 0u64;
    let mut numeric_values: Vec<f64> = Vec::new();
    let mut string_counts: HashMap<String, u64> = HashMap::new();

    for feature in features {
        match feature.properties.as_ref().and_then(|p| p.get(&column)) {
            None | Some(Value::Null) => null_count += 1,
            Some(v) => {
                count += 1;
                match v {
                    Value::Number(n) => {
                        if let Some(f) = n.as_f64() {
                            numeric_values.push(f);
                        }
                    }
                    Value::String(s) => {
                        *string_counts.entry(s.clone()).or_insert(0) += 1;
                    }
                    _ => {}
                }
            }
        }
    }

    let (min, max, mean, histogram) = if !numeric_values.is_empty() {
        let min_val = numeric_values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_val = numeric_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let mean_val = numeric_values.iter().sum::<f64>() / numeric_values.len() as f64;
        let hist = build_histogram(&numeric_values, min_val, max_val, 10);
        (Some(min_val), Some(max_val), Some(mean_val), Some(hist))
    } else {
        (None, None, None, None)
    };

    let (unique_count, top_values) = if !string_counts.is_empty() {
        let unique = string_counts.len() as u64;
        let mut top: Vec<(String, u64)> = string_counts.into_iter().collect();
        top.sort_by(|a, b| b.1.cmp(&a.1));
        top.truncate(10);
        (Some(unique), Some(top))
    } else {
        (None, None)
    };

    Ok(ColumnStats {
        column,
        col_type,
        count,
        null_count,
        min,
        max,
        mean,
        histogram,
        unique_count,
        top_values,
    })
}
