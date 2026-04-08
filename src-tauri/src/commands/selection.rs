use crate::selection::SelectionStorage;
use crate::state::SourceStorage;
use geojson::Feature;
use libsphere::selection::SelectionDelta;
use libsphere::source::{features_to_wkt, slice_feature_collection};
use libsphere::PageResult;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub async fn selection_set(
    ids: Vec<i64>,
    storage: State<'_, SelectionStorage>,
) -> Result<SelectionDelta, String> {
    let mut state = storage.inner.lock().unwrap();
    Ok(state.set(&ids))
}

#[tauri::command]
pub async fn selection_preview(
    ids: Vec<i64>,
    storage: State<'_, SelectionStorage>,
) -> Result<SelectionDelta, String> {
    let mut state = storage.inner.lock().unwrap();
    Ok(state.preview(&ids))
}

#[tauri::command]
pub async fn selection_add(
    ids: Vec<i64>,
    storage: State<'_, SelectionStorage>,
) -> Result<SelectionDelta, String> {
    let mut state = storage.inner.lock().unwrap();
    Ok(state.add(&ids))
}

#[tauri::command]
pub async fn selection_remove(
    ids: Vec<i64>,
    storage: State<'_, SelectionStorage>,
) -> Result<SelectionDelta, String> {
    let mut state = storage.inner.lock().unwrap();
    Ok(state.remove(&ids))
}

#[tauri::command]
pub async fn selection_apply(
    storage: State<'_, SelectionStorage>,
) -> Result<SelectionDelta, String> {
    let mut state = storage.inner.lock().unwrap();
    Ok(state.apply())
}

#[tauri::command]
pub async fn selection_clear(
    storage: State<'_, SelectionStorage>,
) -> Result<SelectionDelta, String> {
    let mut last_gen = storage.generation.lock().unwrap();
    *last_gen = 0;
    let mut cache = storage.feature_cache.lock().unwrap();
    cache.clear();
    let mut state = storage.inner.lock().unwrap();
    Ok(state.clear())
}

#[tauri::command]
pub async fn selection_count(
    storage: State<'_, SelectionStorage>,
) -> Result<usize, String> {
    let state = storage.inner.lock().unwrap();
    Ok(state.count())
}

#[tauri::command]
pub async fn selection_get_ids(
    storage: State<'_, SelectionStorage>,
) -> Result<Vec<i64>, String> {
    let state = storage.inner.lock().unwrap();
    Ok(state.get_ids())
}

#[tauri::command]
pub async fn selection_query_page(
    source_id: String,
    offset: u64,
    limit: u64,
    sort_column: Option<String>,
    sort_asc: Option<bool>,
    selection_storage: State<'_, SelectionStorage>,
    source_storage: State<'_, SourceStorage>,
) -> Result<PageResult, String> {
    let ids = {
        let state = selection_storage.inner.lock().unwrap();
        state.get_ids()
    };

    if ids.is_empty() {
        return Ok(PageResult {
            features: vec![],
            total_matching: 0,
            offset,
            limit,
        });
    }

    let fs = {
        let store = source_storage.store.lock().unwrap();
        let entry = store.get(&source_id).ok_or_else(|| format!("Not found {}", &source_id))?;
        entry.store.as_ref().ok_or_else(|| "No feature store for this source".to_string())?.clone()
    };

    let filter_value = serde_json::json!(["in", ["id"], ["literal", ids]]);
    let filter = libexpression::parse(filter_value).map_err(|e| e.to_string())?;

    let result = fs.query_page(
        offset,
        limit,
        Some(&filter),
        sort_column.as_deref(),
        sort_asc.unwrap_or(true),
    );

    Ok(result)
}

#[tauri::command]
pub async fn selection_rect(
    source_id: String,
    bbox: [f64; 4],
    mode: String,
    op: String,
    generation: u64,
    selection_storage: State<'_, SelectionStorage>,
    source_storage: State<'_, SourceStorage>,
) -> Result<SelectionDelta, String> {
    let fs = {
        let store = source_storage.store.lock().unwrap();
        let entry = store
            .get(&source_id)
            .ok_or_else(|| format!("Not found {}", &source_id))?;
        entry
            .store
            .as_ref()
            .ok_or_else(|| "No feature store for this source".to_string())?
            .clone()
    };
    let ids = fs.query_rect(bbox, &mode);
    let mut last_gen = selection_storage.generation.lock().unwrap();
    if generation < *last_gen {
        return Ok(SelectionDelta {
            added: vec![],
            removed: vec![],
        });
    }
    *last_gen = generation;
    let mut state = selection_storage.inner.lock().unwrap();
    let delta = match op.as_str() {
        "set" => state.set(&ids),
        "preview" => state.preview(&ids),
        "add" => state.add(&ids),
        other => return Err(format!("Unknown selection_rect op: {}", other)),
    };
    Ok(delta)
}

#[tauri::command]
pub async fn selection_copy_geojson(
    source_id: String,
    wrap_fc: bool,
    source_storage: State<'_, SourceStorage>,
    selection_storage: State<'_, SelectionStorage>,
) -> Result<String, String> {
    let ids = {
        let state = selection_storage.inner.lock().unwrap();
        state.get_ids()
    };

    if ids.is_empty() {
        return Ok(String::new());
    }

    let fc = {
        let store = source_storage.store.lock().unwrap();
        let entry = store
            .get(&source_id)
            .ok_or_else(|| format!("Not found {}", &source_id))?;
        entry.source.to_feature_collection()?
    };

    let sliced = slice_feature_collection(fc, &ids);
    serialize_geojson_copy(&sliced, wrap_fc)
}

fn serialize_geojson_copy(
    fc: &geojson::FeatureCollection,
    wrap_fc: bool,
) -> Result<String, String> {
    if wrap_fc {
        serde_json::to_string(fc).map_err(|e| e.to_string())
    } else if fc.features.len() == 1 {
        serde_json::to_string(&fc.features[0]).map_err(|e| e.to_string())
    } else {
        serde_json::to_string(&fc.features).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn selection_copy_wkt(
    source_id: String,
    separator: String,
    source_storage: State<'_, SourceStorage>,
    selection_storage: State<'_, SelectionStorage>,
) -> Result<String, String> {
    let ids = {
        let state = selection_storage.inner.lock().unwrap();
        state.get_ids()
    };

    if ids.is_empty() {
        return Ok(String::new());
    }

    let fc = {
        let store = source_storage.store.lock().unwrap();
        let entry = store
            .get(&source_id)
            .ok_or_else(|| format!("Not found {}", &source_id))?;
        entry.source.to_feature_collection()?
    };

    Ok(features_to_wkt(&fc, &ids, &separator))
}

#[tauri::command]
pub async fn selection_rect_features(
    features_json: String,
    bbox: [f64; 4],
    mode: String,
    op: String,
    generation: u64,
    selection_storage: State<'_, SelectionStorage>,
) -> Result<SelectionDelta, String> {
    let features: Vec<Feature> =
        serde_json::from_str(&features_json).map_err(|e| e.to_string())?;

    let mut last_gen = selection_storage.generation.lock().unwrap();
    if generation < *last_gen {
        return Ok(SelectionDelta {
            added: vec![],
            removed: vec![],
        });
    }
    *last_gen = generation;

    let mut state = selection_storage.inner.lock().unwrap();
    let mut cache = selection_storage.feature_cache.lock().unwrap();
    Ok(rect_features_core(
        &features, bbox, &mode, &op, &mut state, &mut cache,
    ))
}

#[tauri::command]
pub async fn selection_cache_features(
    features_json: String,
    selection_storage: State<'_, SelectionStorage>,
) -> Result<(), String> {
    let features: Vec<Feature> =
        serde_json::from_str(&features_json).map_err(|e| e.to_string())?;
    let mut cache = selection_storage.feature_cache.lock().unwrap();
    for f in &features {
        if let Some(id) = feature_id_i64(f) {
            cache.insert(id, f.clone());
        }
    }
    Ok(())
}

fn feature_id_i64(feature: &Feature) -> Option<i64> {
    match &feature.id {
        Some(geojson::feature::Id::Number(n)) => n.as_i64(),
        _ => None,
    }
}

fn rect_features_core(
    features: &[Feature],
    bbox: [f64; 4],
    mode: &str,
    op: &str,
    state: &mut libsphere::SelectionState,
    cache: &mut HashMap<i64, Feature>,
) -> SelectionDelta {
    // Merge all features into cache
    for f in features {
        if let Some(id) = feature_id_i64(f) {
            cache.insert(id, f.clone());
        }
    }

    // Build temporary spatial index and query
    let store = libsphere::FeatureStore::from_features(features.to_vec());
    let ids = store.query_rect(bbox, mode);

    match op {
        "set" => state.set(&ids),
        "preview" => state.preview(&ids),
        "add" => state.add(&ids),
        _ => SelectionDelta {
            added: vec![],
            removed: vec![],
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use geojson::{feature::Id, Feature, FeatureCollection};

    fn point_feature(id: i64, x: f64, y: f64) -> Feature {
        Feature {
            id: Some(Id::Number(id.into())),
            geometry: Some(geojson::Geometry::new(geojson::Value::Point(vec![x, y]))),
            properties: None,
            bbox: None,
            foreign_members: None,
        }
    }

    fn make_fc(features: Vec<Feature>) -> FeatureCollection {
        FeatureCollection {
            features,
            bbox: None,
            foreign_members: None,
        }
    }

    #[test]
    fn geojson_wrap_fc_returns_feature_collection() {
        let fc = make_fc(vec![point_feature(1, 0.0, 0.0)]);
        let result = serialize_geojson_copy(&fc, true).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["type"], "FeatureCollection");
        assert_eq!(parsed["features"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn geojson_no_wrap_single_feature_returns_feature() {
        let fc = make_fc(vec![point_feature(1, 5.0, 10.0)]);
        let result = serialize_geojson_copy(&fc, false).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["type"], "Feature");
        assert_eq!(parsed["geometry"]["coordinates"][0], 5.0);
    }

    #[test]
    fn geojson_no_wrap_multiple_features_returns_array() {
        let fc = make_fc(vec![point_feature(1, 0.0, 0.0), point_feature(2, 1.0, 1.0)]);
        let result = serialize_geojson_copy(&fc, false).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        let arr = parsed.as_array().unwrap();
        assert_eq!(arr.len(), 2);
        assert_eq!(arr[0]["type"], "Feature");
    }

    #[test]
    fn geojson_wrap_empty_fc() {
        let fc = make_fc(vec![]);
        let result = serialize_geojson_copy(&fc, true).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["type"], "FeatureCollection");
        assert_eq!(parsed["features"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn geojson_no_wrap_empty_returns_empty_array() {
        let fc = make_fc(vec![]);
        let result = serialize_geojson_copy(&fc, false).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.as_array().unwrap().len(), 0);
    }

    #[test]
    fn rect_features_selects_by_include_mode() {
        use libsphere::SelectionState;

        // Three points: (0,0), (5,5), (20,20)
        let features = vec![
            point_feature(1, 0.0, 0.0),
            point_feature(2, 5.0, 5.0),
            point_feature(3, 20.0, 20.0),
        ];
        let bbox = [-1.0, -1.0, 10.0, 10.0]; // includes points 1,2 but not 3
        let mut state = SelectionState::default();
        let mut cache = std::collections::HashMap::new();

        let delta = rect_features_core(&features, bbox, "include", "set", &mut state, &mut cache);

        let mut selected: Vec<i64> = delta.added.clone();
        selected.sort();
        assert_eq!(selected, vec![1, 2]);
        assert!(delta.removed.is_empty());
        // Cache should contain all 3 features (superset)
        assert_eq!(cache.len(), 3);
    }

    #[test]
    fn rect_features_merges_cache_across_calls() {
        use libsphere::SelectionState;

        let features1 = vec![point_feature(1, 0.0, 0.0)];
        let features2 = vec![point_feature(2, 5.0, 5.0)];
        let bbox = [-1.0, -1.0, 10.0, 10.0];
        let mut state = SelectionState::default();
        let mut cache = std::collections::HashMap::new();

        rect_features_core(&features1, bbox, "include", "set", &mut state, &mut cache);
        rect_features_core(&features2, bbox, "include", "add", &mut state, &mut cache);

        assert_eq!(cache.len(), 2);
        assert!(cache.contains_key(&1));
        assert!(cache.contains_key(&2));
    }
}
