use libsphere::FeatureStore;
use libsphere::Bounds;
use libsphere::PageResult;
use libsphere::schema::{assign_feature_ids, SourceSchema};
use libsphere::source::{Source, SourceData};
use mbtiles::tile::Tile;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use url::Url;

use crate::selection::SelectionStorage;
use crate::state::{SourceEntry, SourceStorage};

const HISTOGRAM_BINS: usize = 10;
const DEFAULT_TOP_VALUES: usize = 10;

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

pub(crate) fn build_feature_store(source: &Source) -> Result<FeatureStore, String> {
    let fc = source.to_feature_collection().map_err(|e| e.to_string())?;
    Ok(FeatureStore::from_features(fc.features))
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
                    SourceData::InMemory(_) => "geojson".into(),
                },
            };
            let id = source.id.clone();
            // MBTiles sources intentionally have no feature store.
            // For all other source types, failure to build the store is an error.
            let store = match &source.data {
                SourceData::Mbtiles(_) => None,
                _ => Some(Arc::new(build_feature_store(&source)?)),
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
pub async fn source_get_slice(
    id: String,
    ids: Vec<i64>,
    storage: State<'_, SourceStorage>,
) -> Result<String, String> {
    let store = storage.store.lock().unwrap();
    let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
    let fc = entry.source.to_feature_collection()?;
    let result = libsphere::source::slice_feature_collection(fc, &ids);
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn source_get_selected(
    id: String,
    source_storage: State<'_, SourceStorage>,
    selection_storage: State<'_, SelectionStorage>,
) -> Result<String, String> {
    let ids = {
        let state = selection_storage.inner.lock().unwrap();
        state.get_ids()
    };
    let store = source_storage.store.lock().unwrap();
    let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
    if ids.is_empty() {
        entry.source.to_geojson()
    } else {
        let fc = entry.source.to_feature_collection()?;
        let result = libsphere::source::slice_feature_collection(fc, &ids);
        serde_json::to_string(&result).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn source_get_schema(id: String, storage: State<'_, SourceStorage>) -> Result<SourceSchema, String> {
    let store = storage.store.lock().unwrap();
    match store.get(&id) {
        Some(entry) => match &entry.store {
            Some(fs) => Ok(fs.schema().clone()),
            None => entry.source.get_schema(),
        },
        None => Err(format!("Not found {}", &id)),
    }
}

#[tauri::command]
pub async fn source_bounds(id: String, storage: State<'_, SourceStorage>) -> Result<(f64, f64, f64, f64), String> {
    let store = storage.store.lock().unwrap();
    match store.get(&id) {
        Some(entry) => {
            if let Some(fs) = &entry.store {
                if let Some(bounds) = fs.get_bounds() {
                    return Ok(bounds);
                }
            }
            match entry.source.get_bounds() {
                Some(bounds) => Ok(bounds),
                None => Err(format!("Cannot get bounds {}", &id)),
            }
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
pub async fn source_get_filtered(
    id: String,
    filter_json: Option<String>,
    storage: State<'_, SourceStorage>,
) -> Result<String, String> {
    let filter = match &filter_json {
        None => None,
        Some(json_str) => {
            let json_val: Value = serde_json::from_str(json_str).map_err(|e| e.to_string())?;
            Some(libexpression::parse(json_val).map_err(|e| e.to_string())?)
        }
    };

    let store = storage.store.lock().unwrap();
    let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;

    match filter {
        None => entry.source.to_geojson(),
        Some(expr) => {
            let fs = entry.store.as_ref().ok_or_else(|| "No feature store for this source".to_string())?;
            let features = fs.get_filtered(Some(&expr));
            let fc = serde_json::json!({
                "type": "FeatureCollection",
                "features": features,
            });
            serde_json::to_string(&fc).map_err(|e| e.to_string())
        }
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

    let fs = {
        let store = storage.store.lock().unwrap();
        let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
        entry.store.as_ref().ok_or_else(|| "No feature store for this source".to_string())?.clone()
    };

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
    ids: Option<Vec<i64>>,
    top_n: Option<usize>,
    storage: State<'_, SourceStorage>,
) -> Result<ColumnStats, String> {
    let fs = {
        let store = storage.store.lock().unwrap();
        let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
        entry
            .store
            .as_ref()
            .ok_or_else(|| "No feature store for this source".to_string())?
            .clone()
    };

    let col_type = fs
        .schema()
        .columns
        .get(&column)
        .cloned()
        .ok_or_else(|| format!("Column '{}' not found in source '{}'", column, id))?;

    let top_n = top_n.unwrap_or(DEFAULT_TOP_VALUES);

    tokio::task::spawn_blocking(move || compute_column_stats(fs, column, col_type, ids, top_n))
        .await
        .map_err(|e| e.to_string())?
}

fn compute_column_stats(
    fs: Arc<FeatureStore>,
    column: String,
    col_type: String,
    ids: Option<Vec<i64>>,
    top_n: usize,
) -> Result<ColumnStats, String> {
    let id_filter: Option<std::collections::HashSet<i64>> =
        ids.map(|v| v.into_iter().collect());

    let all_features = fs.features();
    let features_iter: Box<dyn Iterator<Item = &geojson::Feature>> = match &id_filter {
        Some(set) => Box::new(all_features.iter().filter(move |f| match &f.id {
            Some(geojson::feature::Id::Number(n)) => {
                n.as_i64().map(|v| set.contains(&v)).unwrap_or(false)
            }
            _ => false,
        })),
        None => Box::new(all_features.iter()),
    };

    let mut count = 0u64;
    let mut null_count = 0u64;
    let mut numeric_values: Vec<f64> = Vec::new();
    let mut string_counts: HashMap<String, u64> = HashMap::new();

    for feature in features_iter {
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
        let hist = build_histogram(&numeric_values, min_val, max_val, HISTOGRAM_BINS);
        (Some(min_val), Some(max_val), Some(mean_val), Some(hist))
    } else {
        (None, None, None, None)
    };

    let (unique_count, top_values) = if !string_counts.is_empty() {
        let unique = string_counts.len() as u64;
        let mut top: Vec<(String, u64)> = string_counts.into_iter().collect();
        top.sort_by(|a, b| b.1.cmp(&a.1));
        top.truncate(top_n);
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

#[tauri::command]
pub async fn source_query_rect(
    id: String,
    bbox: [f64; 4],
    mode: String,
    storage: State<'_, SourceStorage>,
) -> Result<Vec<i64>, String> {
    let fs = {
        let store = storage.store.lock().unwrap();
        let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
        entry.store.as_ref().ok_or_else(|| "No feature store for this source".to_string())?.clone()
    };
    Ok(fs.query_rect(bbox, &mode))
}

#[derive(Deserialize, Debug)]
pub struct SourcePatch {
    pub added: Vec<serde_json::Value>,
    pub updated: Vec<serde_json::Value>,
    pub deleted_ids: Vec<serde_json::Value>,
}

#[tauri::command]
pub async fn source_add_data(
    name: String,
    data: geojson::FeatureCollection,
    storage: State<'_, SourceStorage>,
) -> Result<SourceAddResult, String> {
    let mut fc = data;
    assign_feature_ids(&mut fc);
    let id = crate::id::generate_id();
    let location = format!("sphere://{}", id);
    let source = Source {
        id: id.clone(),
        name: name.clone(),
        location: location.clone(),
        data: SourceData::InMemory(fc),
    };
    let store = Arc::new(build_feature_store(&source)?);
    let entry = SourceEntry { source, store: Some(store) };
    storage.store.lock().unwrap().insert(id.clone(), entry);
    Ok(SourceAddResult {
        id,
        name,
        location,
        source_type: "geojson".into(),
    })
}

#[tauri::command]
pub async fn source_replace(
    id: String,
    data: geojson::FeatureCollection,
    storage: State<'_, SourceStorage>,
) -> Result<(), String> {
    let mut new_fc = data;
    assign_feature_ids(&mut new_fc);
    let new_store = Arc::new(FeatureStore::from_features(new_fc.features.clone()));

    let mut store = storage.store.lock().unwrap();
    let entry = store.get_mut(&id).ok_or_else(|| format!("Not found {}", id))?;
    match &entry.source.data {
        SourceData::InMemory(_) => {}
        _ => return Err(format!("Source {} is not an in-memory source", id)),
    }
    entry.source.data = SourceData::InMemory(new_fc);
    entry.store = Some(new_store);
    Ok(())
}

#[tauri::command]
pub async fn source_patch(
    id: String,
    patch: SourcePatch,
    storage: State<'_, SourceStorage>,
) -> Result<(), String> {
    let updated_features: Vec<geojson::Feature> = patch.updated.iter()
        .map(|v| {
            serde_json::from_value(v.clone())
                .map_err(|e| format!("Failed to parse updated feature: {}", e))
        })
        .collect::<Result<_, _>>()?;

    let added_features: Vec<geojson::Feature> = patch.added.iter()
        .map(|v| {
            serde_json::from_value(v.clone())
                .map_err(|e| format!("Failed to parse added feature: {}", e))
        })
        .collect::<Result<_, _>>()?;

    let mut store = storage.store.lock().unwrap();
    let entry = store.get_mut(&id).ok_or_else(|| format!("Not found {}", id))?;
    let fc = match &mut entry.source.data {
        SourceData::InMemory(fc) => fc,
        _ => return Err(format!("Source {} is not an in-memory source", id)),
    };

    fc.features.retain(|f| {
        !patch.deleted_ids.iter().any(|del_id| f.id.as_ref().map_or(false, |fid| {
            match (fid, del_id) {
                (geojson::feature::Id::Number(n), serde_json::Value::Number(m)) => {
                    n.as_f64() == m.as_f64()
                }
                (geojson::feature::Id::String(s), serde_json::Value::String(t)) => s == t,
                _ => false,
            }
        }))
    });

    for updated_feature in updated_features {
        if let Some(feat) = fc.features.iter_mut().find(|f| f.id == updated_feature.id) {
            *feat = updated_feature;
        }
    }

    for added_feature in added_features {
        fc.features.push(added_feature);
    }
    assign_feature_ids(fc);

    entry.store = Some(Arc::new(build_feature_store(&entry.source)?));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use geojson::{feature::Id, Feature, FeatureCollection, Geometry, Value as GeoValue};
    use libsphere::geojson::Geojson;
    use serde_json::json;
    use tauri::test::{mock_app, MockRuntime};
    use tauri::{App, Manager};

    fn point(x: f64, y: f64, props: Value) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![x, y]))),
            id: None,
            properties: props.as_object().cloned(),
            foreign_members: None,
        }
    }

    fn line(coords: Vec<Vec<f64>>) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::LineString(coords))),
            id: None,
            properties: json!({}).as_object().cloned(),
            foreign_members: None,
        }
    }

    fn collection(features: Vec<Feature>) -> FeatureCollection {
        FeatureCollection { bbox: None, features, foreign_members: None }
    }

    fn test_app() -> App<MockRuntime> {
        let app = mock_app();
        app.manage(SourceStorage::default());
        app.manage(SelectionStorage::default());
        app
    }

    /// Three points at (0,0), (10,10), (20,20) with a numeric `pop` and a string `kind`.
    fn sample_features() -> Vec<Feature> {
        vec![
            point(0.0, 0.0, json!({ "name": "a", "pop": 10, "kind": "city" })),
            point(10.0, 10.0, json!({ "name": "b", "pop": 20, "kind": "city" })),
            point(20.0, 20.0, json!({ "name": "c", "pop": 30, "kind": "town" })),
        ]
    }

    async fn add_source(app: &App<MockRuntime>, features: Vec<Feature>) -> String {
        source_add_data("sample".into(), collection(features), app.state())
            .await
            .unwrap()
            .id
    }

    /// Registers a source whose data is a file-backed Geojson, i.e. not in-memory.
    fn add_file_source(app: &App<MockRuntime>, id: &str) {
        let source = Source {
            id: id.into(),
            name: "file".into(),
            location: "/tmp/does-not-exist.geojson".into(),
            data: SourceData::Geojson(Geojson { path: "/tmp/does-not-exist.geojson".into() }),
        };
        let storage = app.state::<SourceStorage>();
        storage
            .store
            .lock()
            .unwrap()
            .insert(id.into(), SourceEntry { source, store: None });
    }

    fn feature_ids(geojson: &str) -> Vec<i64> {
        let parsed: Value = serde_json::from_str(geojson).unwrap();
        parsed["features"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|f| f["id"].as_i64())
            .collect()
    }

    #[tokio::test]
    async fn add_data_registers_the_source_and_assigns_ids_from_one() {
        let app = test_app();

        let result = source_add_data("sample".into(), collection(sample_features()), app.state())
            .await
            .unwrap();

        assert_eq!(result.name, "sample");
        assert_eq!(result.source_type, "geojson");
        assert_eq!(result.location, format!("sphere://{}", result.id));

        let geojson = source_get(result.id.clone(), app.state()).await.unwrap();
        assert_eq!(feature_ids(&geojson), vec![1, 2, 3]);
    }

    #[tokio::test]
    async fn add_data_preserves_original_string_ids_under_dollar_id() {
        let app = test_app();
        let mut feature = point(0.0, 0.0, json!({}));
        feature.id = Some(Id::String("abc".into()));

        let id = add_source(&app, vec![feature]).await;

        let geojson = source_get(id, app.state()).await.unwrap();
        let parsed: Value = serde_json::from_str(&geojson).unwrap();
        assert_eq!(parsed["features"][0]["id"], 1);
        assert_eq!(parsed["features"][0]["properties"]["$id"], "abc");
    }

    #[tokio::test]
    async fn get_reports_a_missing_source() {
        let app = test_app();

        let err = source_get("nope".into(), app.state()).await.unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn get_slice_returns_only_the_requested_features() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let geojson = source_get_slice(id, vec![1, 3], app.state()).await.unwrap();

        assert_eq!(feature_ids(&geojson), vec![1, 3]);
    }

    #[tokio::test]
    async fn get_slice_of_unknown_ids_is_empty() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let geojson = source_get_slice(id, vec![99], app.state()).await.unwrap();

        assert!(feature_ids(&geojson).is_empty());
    }

    #[tokio::test]
    async fn get_slice_reports_a_missing_source() {
        let app = test_app();

        let err = source_get_slice("nope".into(), vec![1], app.state()).await.unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn get_selected_returns_every_feature_when_nothing_is_selected() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let geojson = source_get_selected(id, app.state(), app.state()).await.unwrap();

        assert_eq!(feature_ids(&geojson), vec![1, 2, 3]);
    }

    #[tokio::test]
    async fn get_selected_returns_the_selected_subset() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;
        app.state::<SelectionStorage>().inner.lock().unwrap().set(&[2]);

        let geojson = source_get_selected(id, app.state(), app.state()).await.unwrap();

        assert_eq!(feature_ids(&geojson), vec![2]);
    }

    #[tokio::test]
    async fn get_selected_reports_a_missing_source() {
        let app = test_app();

        let err = source_get_selected("nope".into(), app.state(), app.state()).await.unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn get_schema_reports_columns_and_geometry_counts() {
        let app = test_app();
        let mut features = sample_features();
        features.push(line(vec![vec![0.0, 0.0], vec![1.0, 1.0]]));
        let id = add_source(&app, features).await;

        let schema = source_get_schema(id, app.state()).await.unwrap();

        assert_eq!(schema.features_count, 4);
        assert_eq!(schema.points_count, 3);
        assert_eq!(schema.lines_count, 1);
        assert_eq!(schema.columns.get("pop").map(String::as_str), Some("Number"));
        assert_eq!(schema.columns.get("name").map(String::as_str), Some("String"));
    }

    #[tokio::test]
    async fn get_schema_reports_a_missing_source() {
        let app = test_app();

        let err = source_get_schema("nope".into(), app.state()).await.unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn bounds_cover_every_feature() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let bounds = source_bounds(id, app.state()).await.unwrap();

        assert_eq!(bounds, (0.0, 0.0, 20.0, 20.0));
    }

    #[tokio::test]
    async fn bounds_report_a_missing_source() {
        let app = test_app();

        let err = source_bounds("nope".into(), app.state()).await.unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn get_filtered_without_a_filter_returns_every_feature() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let geojson = source_get_filtered(id, None, app.state()).await.unwrap();

        assert_eq!(feature_ids(&geojson), vec![1, 2, 3]);
    }

    #[tokio::test]
    async fn get_filtered_keeps_only_matching_features() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;
        let filter = json!(["==", ["get", "kind"], "town"]).to_string();

        let geojson = source_get_filtered(id, Some(filter), app.state()).await.unwrap();

        assert_eq!(feature_ids(&geojson), vec![3]);
    }

    #[tokio::test]
    async fn get_filtered_rejects_malformed_filter_json() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let err = source_get_filtered(id, Some("{not json".into()), app.state())
            .await
            .unwrap_err();

        assert!(!err.is_empty());
    }

    #[tokio::test]
    async fn get_filtered_rejects_an_unparseable_expression() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;
        let filter = json!(["no-such-operator", 1]).to_string();

        let err = source_get_filtered(id, Some(filter), app.state()).await.unwrap_err();

        assert!(!err.is_empty());
    }

    #[tokio::test]
    async fn query_page_limits_the_page_but_reports_the_full_total() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let page = source_query_page(id, 1, 1, None, None, None, app.state()).await.unwrap();

        assert_eq!(page.total_matching, 3);
        assert_eq!(page.offset, 1);
        assert_eq!(page.limit, 1);
        assert_eq!(page.features.len(), 1);
    }

    #[tokio::test]
    async fn query_page_sorts_descending_when_asked() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let page = source_query_page(id, 0, 10, Some("pop".into()), Some(false), None, app.state())
            .await
            .unwrap();

        let names: Vec<&str> = page
            .features
            .iter()
            .filter_map(|f| f["properties"]["name"].as_str())
            .collect();
        assert_eq!(names, vec!["c", "b", "a"]);
    }

    #[tokio::test]
    async fn query_page_applies_the_filter_to_the_total() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;
        let filter = json!([">", ["get", "pop"], 15]).to_string();

        let page = source_query_page(id, 0, 10, None, None, Some(filter), app.state())
            .await
            .unwrap();

        assert_eq!(page.total_matching, 2);
    }

    #[tokio::test]
    async fn query_page_reports_a_missing_source() {
        let app = test_app();

        let err = source_query_page("nope".into(), 0, 10, None, None, None, app.state())
            .await
            .unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn column_stats_describe_a_numeric_column() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let stats = source_get_column_stats(id, "pop".into(), None, None, app.state())
            .await
            .unwrap();

        assert_eq!(stats.count, 3);
        assert_eq!(stats.null_count, 0);
        assert_eq!(stats.min, Some(10.0));
        assert_eq!(stats.max, Some(30.0));
        assert_eq!(stats.mean, Some(20.0));
        assert_eq!(stats.histogram.as_ref().map(|h| h.len()), Some(HISTOGRAM_BINS));
        assert_eq!(stats.unique_count, None);
    }

    #[tokio::test]
    async fn column_stats_describe_a_string_column() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let stats = source_get_column_stats(id, "kind".into(), None, None, app.state())
            .await
            .unwrap();

        assert_eq!(stats.col_type, "String");
        assert_eq!(stats.unique_count, Some(2));
        assert_eq!(stats.top_values, Some(vec![("city".into(), 2), ("town".into(), 1)]));
        assert!(stats.histogram.is_none());
    }

    #[tokio::test]
    async fn column_stats_honour_the_top_n_limit() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let stats = source_get_column_stats(id, "kind".into(), None, Some(1), app.state())
            .await
            .unwrap();

        assert_eq!(stats.unique_count, Some(2));
        assert_eq!(stats.top_values.map(|v| v.len()), Some(1));
    }

    #[tokio::test]
    async fn column_stats_restricted_to_ids_only_count_those_features() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let stats = source_get_column_stats(id, "pop".into(), Some(vec![1]), None, app.state())
            .await
            .unwrap();

        assert_eq!(stats.count, 1);
        assert_eq!(stats.min, Some(10.0));
        assert_eq!(stats.max, Some(10.0));
    }

    #[tokio::test]
    async fn column_stats_count_missing_values_as_null() {
        let app = test_app();
        let features = vec![
            point(0.0, 0.0, json!({ "pop": 10 })),
            point(1.0, 1.0, json!({})),
        ];
        let id = add_source(&app, features).await;

        let stats = source_get_column_stats(id, "pop".into(), None, None, app.state())
            .await
            .unwrap();

        assert_eq!(stats.count, 1);
        assert_eq!(stats.null_count, 1);
    }

    #[tokio::test]
    async fn column_stats_reject_an_unknown_column() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let err = source_get_column_stats(id.clone(), "missing".into(), None, None, app.state())
            .await
            .unwrap_err();

        assert_eq!(err, format!("Column 'missing' not found in source '{}'", id));
    }

    #[tokio::test]
    async fn column_stats_report_a_missing_source() {
        let app = test_app();

        let err = source_get_column_stats("nope".into(), "pop".into(), None, None, app.state())
            .await
            .unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn query_rect_include_keeps_only_fully_contained_features() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let ids = source_query_rect(id, [-1.0, -1.0, 11.0, 11.0], "include".into(), app.state())
            .await
            .unwrap();

        assert_eq!(ids, vec![1, 2]);
    }

    #[tokio::test]
    async fn query_rect_intersect_keeps_features_crossing_the_rect() {
        let app = test_app();
        let features = vec![line(vec![vec![-5.0, 0.0], vec![5.0, 0.0]])];
        let id = add_source(&app, features).await;

        let included = source_query_rect(
            id.clone(),
            [-1.0, -1.0, 1.0, 1.0],
            "include".into(),
            app.state(),
        )
        .await
        .unwrap();
        let intersected = source_query_rect(
            id,
            [-1.0, -1.0, 1.0, 1.0],
            "intersect".into(),
            app.state(),
        )
        .await
        .unwrap();

        assert!(included.is_empty());
        assert_eq!(intersected, vec![1]);
    }

    #[tokio::test]
    async fn query_rect_outside_the_data_is_empty() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        let ids = source_query_rect(id, [100.0, 100.0, 110.0, 110.0], "include".into(), app.state())
            .await
            .unwrap();

        assert!(ids.is_empty());
    }

    #[tokio::test]
    async fn query_rect_reports_a_missing_source() {
        let app = test_app();

        let err = source_query_rect("nope".into(), [0.0, 0.0, 1.0, 1.0], "include".into(), app.state())
            .await
            .unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn replace_swaps_every_feature() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;

        source_replace(id.clone(), collection(vec![point(5.0, 5.0, json!({ "name": "z" }))]), app.state())
            .await
            .unwrap();

        let geojson = source_get(id.clone(), app.state()).await.unwrap();
        let parsed: Value = serde_json::from_str(&geojson).unwrap();
        assert_eq!(parsed["features"].as_array().unwrap().len(), 1);
        assert_eq!(parsed["features"][0]["properties"]["name"], "z");
        assert_eq!(source_bounds(id, app.state()).await.unwrap(), (5.0, 5.0, 5.0, 5.0));
    }

    #[tokio::test]
    async fn replace_reports_a_missing_source() {
        let app = test_app();

        let err = source_replace("nope".into(), collection(vec![]), app.state())
            .await
            .unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn replace_rejects_a_source_that_is_not_in_memory() {
        let app = test_app();
        add_file_source(&app, "file-source");

        let err = source_replace("file-source".into(), collection(vec![]), app.state())
            .await
            .unwrap_err();

        assert_eq!(err, "Source file-source is not an in-memory source");
    }

    #[tokio::test]
    async fn patch_adds_updates_and_deletes_features() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;
        let patch = SourcePatch {
            added: vec![serde_json::to_value(point(30.0, 30.0, json!({ "name": "d" }))).unwrap()],
            updated: vec![json!({
                "type": "Feature",
                "id": 2,
                "geometry": { "type": "Point", "coordinates": [11.0, 11.0] },
                "properties": { "name": "b2" }
            })],
            deleted_ids: vec![json!(1)],
        };

        source_patch(id.clone(), patch, app.state()).await.unwrap();

        let geojson = source_get(id.clone(), app.state()).await.unwrap();
        let parsed: Value = serde_json::from_str(&geojson).unwrap();
        let names: Vec<&str> = parsed["features"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|f| f["properties"]["name"].as_str())
            .collect();
        assert_eq!(names, vec!["b2", "c", "d"]);
        assert_eq!(parsed["features"][0]["geometry"]["coordinates"][0], 11.0);
    }

    #[tokio::test]
    async fn patch_rebuilds_the_feature_store() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;
        let patch = SourcePatch {
            added: vec![],
            updated: vec![],
            deleted_ids: vec![json!(2), json!(3)],
        };

        source_patch(id.clone(), patch, app.state()).await.unwrap();

        let schema = source_get_schema(id.clone(), app.state()).await.unwrap();
        assert_eq!(schema.features_count, 1);
        assert_eq!(source_bounds(id, app.state()).await.unwrap(), (0.0, 0.0, 0.0, 0.0));
    }

    #[tokio::test]
    async fn patch_gives_added_features_fresh_ids() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;
        let patch = SourcePatch {
            added: vec![serde_json::to_value(point(30.0, 30.0, json!({ "name": "d" }))).unwrap()],
            updated: vec![],
            deleted_ids: vec![],
        };

        source_patch(id.clone(), patch, app.state()).await.unwrap();

        let geojson = source_get(id, app.state()).await.unwrap();
        assert_eq!(feature_ids(&geojson), vec![1, 2, 3, 4]);
    }

    #[tokio::test]
    async fn patch_rejects_a_malformed_added_feature() {
        let app = test_app();
        let id = add_source(&app, sample_features()).await;
        let patch = SourcePatch {
            added: vec![json!({ "type": "NotAFeature" })],
            updated: vec![],
            deleted_ids: vec![],
        };

        let err = source_patch(id, patch, app.state()).await.unwrap_err();

        assert!(err.starts_with("Failed to parse added feature"));
    }

    #[tokio::test]
    async fn patch_reports_a_missing_source() {
        let app = test_app();
        let patch = SourcePatch { added: vec![], updated: vec![], deleted_ids: vec![] };

        let err = source_patch("nope".into(), patch, app.state()).await.unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn patch_rejects_a_source_that_is_not_in_memory() {
        let app = test_app();
        add_file_source(&app, "file-source");
        let patch = SourcePatch { added: vec![], updated: vec![], deleted_ids: vec![] };

        let err = source_patch("file-source".into(), patch, app.state()).await.unwrap_err();

        assert_eq!(err, "Source file-source is not an in-memory source");
    }

    #[tokio::test]
    async fn mbtiles_commands_reject_a_source_that_is_not_mbtiles() {
        let app = test_app();
        add_file_source(&app, "file-source");

        let tile_err = mbtiles_get_tile("file-source".into(), 0, 0, 0, app.state())
            .await
            .unwrap_err();
        let meta_err = mbtiles_get_metadata("file-source".into(), app.state())
            .await
            .unwrap_err();

        assert_eq!(tile_err, "Source is not MBTiles");
        assert_eq!(meta_err, "Source not found");
    }

    #[tokio::test]
    async fn mbtiles_get_tile_reports_a_missing_source() {
        let app = test_app();

        let err = mbtiles_get_tile("nope".into(), 0, 0, 0, app.state()).await.unwrap_err();

        assert_eq!(err, "Not found nope");
    }

    /// A `.geojson` file in the system temp dir, deleted when the fixture drops.
    struct TempGeojson {
        path: std::path::PathBuf,
    }

    impl TempGeojson {
        fn new(fc: &FeatureCollection) -> TempGeojson {
            static COUNTER: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
            let n = COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            let path = std::env::temp_dir()
                .join(format!("source-test-{}-{}.geojson", std::process::id(), n));
            std::fs::write(&path, serde_json::to_string(fc).unwrap()).unwrap();
            TempGeojson { path }
        }

        fn url(&self) -> String {
            format!("file://{}", self.path.to_string_lossy())
        }
    }

    impl Drop for TempGeojson {
        fn drop(&mut self) {
            let _ = std::fs::remove_file(&self.path);
        }
    }

    #[tokio::test]
    async fn add_loads_a_geojson_file_and_builds_its_feature_store() {
        let app = test_app();
        let mut fc = collection(sample_features());
        assign_feature_ids(&mut fc);
        let file = TempGeojson::new(&fc);

        let result = source_add(&file.url(), app.state()).await.unwrap();

        assert_eq!(result.source_type, "geojson");
        assert_eq!(result.name, file.path.file_stem().unwrap().to_string_lossy());
        let schema = source_get_schema(result.id.clone(), app.state()).await.unwrap();
        assert_eq!(schema.features_count, 3);
        assert_eq!(source_bounds(result.id, app.state()).await.unwrap(), (0.0, 0.0, 20.0, 20.0));
    }

    #[tokio::test]
    async fn add_rejects_an_unparseable_url() {
        let app = test_app();

        let err = source_add("not a url", app.state()).await.unwrap_err();

        assert!(!err.is_empty());
    }

    #[tokio::test]
    async fn add_rejects_a_scheme_it_cannot_handle() {
        let app = test_app();

        let err = source_add("ftp://example.com/data.geojson", app.state()).await.unwrap_err();

        assert_eq!(err, "Cannot handle scheme ftp");
    }

    #[tokio::test]
    async fn add_rejects_a_file_that_does_not_exist() {
        let app = test_app();

        let err = source_add("file:///nope/missing.geojson", app.state()).await.unwrap_err();

        assert_eq!(err, "File not found");
    }

    #[test]
    fn histogram_with_equal_min_and_max_is_a_single_bin() {
        let bins = build_histogram(&[5.0, 5.0, 5.0], 5.0, 5.0, 10);

        assert_eq!(bins.len(), 1);
        assert_eq!(bins[0].count, 3);
    }

    #[test]
    fn histogram_splits_the_range_into_the_requested_bins() {
        let values = vec![0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        let bins = build_histogram(&values, 0.0, 9.0, 10);

        assert_eq!(bins.len(), 10);
        assert_eq!(bins.iter().map(|b| b.count).sum::<u64>(), 10);
    }

    #[test]
    fn histogram_puts_the_maximum_value_in_the_last_bin() {
        let bins = build_histogram(&[0.0, 10.0], 0.0, 10.0, 10);

        assert_eq!(bins[0].count, 1);
        assert_eq!(bins[9].count, 1);
    }
}
