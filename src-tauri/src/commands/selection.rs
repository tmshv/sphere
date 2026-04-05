use crate::selection::SelectionStorage;
use crate::state::SourceStorage;
use libsphere::selection::SelectionDelta;
use libsphere::PageResult;
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
