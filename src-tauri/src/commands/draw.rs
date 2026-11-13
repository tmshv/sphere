//! Draw edit sessions: edit an in-memory source in place, one op at a time, then
//! commit or roll back.
//!
//! Wire shapes (JSON, as sent by `invoke`):
//!
//! `op: EditOpInput` for `draw_apply`, tagged by `type`:
//! ```json
//! { "type": "create", "drawId": "c7f3…", "feature": { "type": "Feature", "geometry": …, "properties": … } }
//! { "type": "update", "id": 12,          "feature": { "type": "Feature", "geometry": …, "properties": … } }
//! { "type": "update", "id": "c7f3…",     "feature": … }
//! { "type": "delete", "id": 12 }
//! { "type": "delete", "id": "c7f3…" }
//! ```
//! `id` is a number for a backend feature id, or a string for the `drawId` of a
//! feature created earlier in the same session. The feature's own `id` is ignored:
//! the backend sets it. `draw_apply` returns the backend id for `create` and
//! `update`, `null` for `delete`.
//!
//! `scope: WorkingScope` for `draw_get_working_set`, tagged by `type`:
//! ```json
//! { "type": "ids",  "ids": [1, 2, 3] }
//! { "type": "bbox", "bbox": [west, south, east, north] }
//! ```
//! `ids` keeps the requested order and skips missing ids; `bbox` returns every
//! feature whose geometry intersects the box, sorted by id.
//!
//! `WorkingSet` result: `{ "features": "<FeatureCollection JSON string>", "overCap": false }`.
//! When more than `cap` features match, `overCap` is `true` and `features` is an
//! empty FeatureCollection.
//!
//! `draw_commit` and `draw_rollback` return the touched backend ids, sorted.

use std::collections::HashSet;

use geojson::{Feature, FeatureCollection};
use libsphere::source::SourceData;
use libsphere::{EditOp, EditRef, EditSession, FeatureStore};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::selection::SelectionStorage;
use crate::state::{SharedFeatureStore, SourceEntry, SourceStorage};

/// Wire form of `libsphere::EditRef`: a number is a backend id, a string a draw id.
#[derive(Deserialize, Debug)]
#[serde(untagged)]
pub enum EditRefInput {
    Id(i64),
    DrawId(String),
}

/// Wire form of `libsphere::EditOp`.
#[derive(Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum EditOpInput {
    Create { draw_id: String, feature: Feature },
    Update { id: EditRefInput, feature: Feature },
    Delete { id: EditRefInput },
}

/// Which features `draw_get_working_set` returns.
#[derive(Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WorkingScope {
    Ids { ids: Vec<i64> },
    Bbox { bbox: [f64; 4] },
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkingSet {
    /// GeoJSON FeatureCollection, serialized.
    pub features: String,
    pub over_cap: bool,
}

impl From<EditRefInput> for EditRef {
    fn from(input: EditRefInput) -> Self {
        match input {
            EditRefInput::Id(id) => EditRef::Id(id),
            EditRefInput::DrawId(draw_id) => EditRef::DrawId(draw_id),
        }
    }
}

impl From<EditOpInput> for EditOp {
    fn from(input: EditOpInput) -> Self {
        match input {
            EditOpInput::Create { draw_id, feature } => EditOp::Create { draw_id, feature },
            EditOpInput::Update { id, feature } => EditOp::Update { id: id.into(), feature },
            EditOpInput::Delete { id } => EditOp::Delete { id: id.into() },
        }
    }
}

/// Mode passed to `FeatureStore::query_rect` for a bbox working set: every
/// feature that touches the box, not only the ones inside it.
const BBOX_MODE: &str = "intersect";

fn not_found(id: &str) -> String {
    format!("Not found {id}")
}

fn no_session(id: &str) -> String {
    format!("Source {id} has no draw session")
}

fn not_in_memory(id: &str) -> String {
    format!("Source {id} is not an in-memory source")
}

/// The store of an in-memory source, the only kind a session can edit.
fn editable_store(entry: &SourceEntry, id: &str) -> Result<SharedFeatureStore, String> {
    match (&entry.source.data, &entry.store) {
        (SourceData::InMemory(_), Some(store)) => Ok(store.clone()),
        _ => Err(not_in_memory(id)),
    }
}

/// The store of a source with an active session.
fn session_store(storage: &SourceStorage, id: &str) -> Result<SharedFeatureStore, String> {
    let sources = storage.store.lock().unwrap();
    let entry = sources.get(id).ok_or_else(|| not_found(id))?;
    if entry.session.is_none() {
        return Err(no_session(id));
    }
    editable_store(entry, id)
}

fn feature_id(feature: &Feature) -> Option<i64> {
    match &feature.id {
        Some(geojson::feature::Id::Number(n)) => n.as_i64(),
        _ => None,
    }
}

fn feature_collection_json(features: Vec<Feature>) -> Result<String, String> {
    let fc = FeatureCollection {
        bbox: None,
        features,
        foreign_members: None,
    };
    serde_json::to_string(&fc).map_err(|e| e.to_string())
}

/// At most `limit` features for `scope`, so an over-cap scope never copies more
/// than one feature past the cap.
fn scope_features(store: &FeatureStore, scope: WorkingScope, limit: usize) -> Vec<Feature> {
    match scope {
        WorkingScope::Ids { ids } => {
            let mut seen = HashSet::new();
            ids.into_iter()
                .filter(|id| seen.insert(*id))
                .filter_map(|id| store.get_by_ids(&[id]).into_iter().next())
                .take(limit)
                .collect()
        }
        WorkingScope::Bbox { bbox } => {
            let mut ids = store.query_rect(bbox, BBOX_MODE);
            ids.sort_unstable();
            ids.dedup();
            ids.truncate(limit);
            store.get_by_ids(&ids)
        }
    }
}

/// Bring the source's FeatureCollection in line with the store after a session.
/// Only the touched features changed, so untouched ones are moved, not copied:
/// a touched feature is replaced in place (or dropped when gone) and features new
/// to the collection are appended in id order.
fn sync_source_data(data: &mut SourceData, store: &FeatureStore, touched: &[i64]) {
    let SourceData::InMemory(fc) = data else {
        return;
    };
    let touched_set: HashSet<i64> = touched.iter().copied().collect();
    let mut placed = HashSet::new();
    let features = std::mem::take(&mut fc.features);
    fc.features = features
        .into_iter()
        .filter_map(|feature| match feature_id(&feature) {
            Some(id) if touched_set.contains(&id) => {
                placed.insert(id);
                store.get_by_ids(&[id]).into_iter().next()
            }
            _ => Some(feature),
        })
        .collect();
    let appended: Vec<i64> = touched.iter().copied().filter(|id| !placed.contains(id)).collect();
    fc.features.extend(store.get_by_ids(&appended));
}

enum SessionEnd {
    Commit,
    Rollback,
}

/// Commit or roll back the session of `id`, then make the rest of the backend
/// agree with the store: the source data, the schema and the selection.
fn end_session(
    id: &str,
    end: SessionEnd,
    storage: &SourceStorage,
    selection: &SelectionStorage,
) -> Result<Vec<i64>, String> {
    let (touched, vanished) = {
        let mut sources = storage.store.lock().unwrap();
        let entry = sources.get_mut(id).ok_or_else(|| not_found(id))?;
        let store = editable_store(entry, id)?;
        let Some(session) = entry.session.take() else {
            return Err(no_session(id));
        };
        let mut fs = store.write().unwrap();
        let touched = match end {
            SessionEnd::Commit => session.commit(),
            SessionEnd::Rollback => session.rollback(&mut fs),
        };
        fs.refresh_schema();
        sync_source_data(&mut entry.source.data, &fs, &touched);
        let vanished: Vec<i64> = touched
            .iter()
            .copied()
            .filter(|t| fs.get_by_ids(&[*t]).is_empty())
            .collect();
        (touched, vanished)
    };
    if !vanished.is_empty() {
        selection.inner.lock().unwrap().remove(&vanished);
    }
    Ok(touched)
}

/// Start a draw session on an in-memory source.
#[tauri::command]
pub async fn draw_begin(id: String, storage: State<'_, SourceStorage>) -> Result<(), String> {
    let mut sources = storage.store.lock().unwrap();
    let entry = sources.get_mut(&id).ok_or_else(|| not_found(&id))?;
    editable_store(entry, &id)?;
    if entry.session.is_some() {
        return Err(format!("Source {id} already has a draw session"));
    }
    entry.session = Some(EditSession::new());
    Ok(())
}

/// Features to load into draw for `scope`, or `overCap` when more than `cap` match.
#[tauri::command]
pub async fn draw_get_working_set(
    id: String,
    scope: WorkingScope,
    cap: usize,
    storage: State<'_, SourceStorage>,
) -> Result<WorkingSet, String> {
    let store = session_store(&storage, &id)?;
    let fs = store.read().unwrap();
    let features = scope_features(&fs, scope, cap.saturating_add(1));
    let over_cap = features.len() > cap;
    let features = if over_cap { Vec::new() } else { features };
    Ok(WorkingSet {
        features: feature_collection_json(features)?,
        over_cap,
    })
}

/// Apply one edit to the source in place. Returns the backend id for create and
/// update, `None` for delete.
#[tauri::command]
pub async fn draw_apply(id: String, op: EditOpInput, storage: State<'_, SourceStorage>) -> Result<Option<i64>, String> {
    let mut sources = storage.store.lock().unwrap();
    let entry = sources.get_mut(&id).ok_or_else(|| not_found(&id))?;
    let store = editable_store(entry, &id);
    let Some(session) = entry.session.as_mut() else {
        return Err(no_session(&id));
    };
    let store = store?;
    let mut fs = store.write().unwrap();
    session.apply(&mut fs, op.into()).map_err(|e| e.to_string())
}

/// Keep the session's edits. Returns the touched ids.
#[tauri::command]
pub async fn draw_commit(
    id: String,
    storage: State<'_, SourceStorage>,
    selection: State<'_, SelectionStorage>,
) -> Result<Vec<i64>, String> {
    end_session(&id, SessionEnd::Commit, &storage, &selection)
}

/// Undo the session's edits. Returns the touched ids.
#[tauri::command]
pub async fn draw_rollback(
    id: String,
    storage: State<'_, SourceStorage>,
    selection: State<'_, SelectionStorage>,
) -> Result<Vec<i64>, String> {
    end_session(&id, SessionEnd::Rollback, &storage, &selection)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::source::{
        source_add_data, source_bounds, source_get, source_get_schema, source_query_page,
        source_replace,
    };
    use crate::state::SourceEntry;
    use geojson::{Geometry, Value as GeoValue};
    use libsphere::geojson::Geojson;
    use libsphere::source::Source;
    use serde_json::{Value, json};
    use tauri::test::{MockRuntime, mock_app};
    use tauri::{App, Manager};

    const CAP: usize = 100;

    fn test_app() -> App<MockRuntime> {
        let app = mock_app();
        app.manage(SourceStorage::default());
        app.manage(SelectionStorage::default());
        app
    }

    fn point(x: f64, y: f64, props: Value) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![x, y]))),
            id: None,
            properties: props.as_object().cloned(),
            foreign_members: None,
        }
    }

    /// Ids 1, 2, 3 at (0,0), (10,10), (20,20).
    async fn add_source(app: &App<MockRuntime>) -> String {
        let features = vec![
            point(0.0, 0.0, json!({ "name": "a" })),
            point(10.0, 10.0, json!({ "name": "b" })),
            point(20.0, 20.0, json!({ "name": "c" })),
        ];
        let fc = FeatureCollection {
            bbox: None,
            features,
            foreign_members: None,
        };
        source_add_data("sample".into(), fc, app.state()).await.unwrap().id
    }

    fn add_file_source(app: &App<MockRuntime>, id: &str) {
        let source = Source {
            id: id.into(),
            name: "file".into(),
            location: "/tmp/does-not-exist.geojson".into(),
            data: SourceData::Geojson(Geojson {
                path: "/tmp/does-not-exist.geojson".into(),
            }),
        };
        app.state::<SourceStorage>()
            .store
            .lock()
            .unwrap()
            .insert(id.into(), SourceEntry::new(source, None));
    }

    fn op(value: Value) -> EditOpInput {
        serde_json::from_value(value).unwrap()
    }

    fn create(draw_id: &str, x: f64, props: Value) -> EditOpInput {
        op(json!({
            "type": "create",
            "drawId": draw_id,
            "feature": serde_json::to_value(point(x, x, props)).unwrap(),
        }))
    }

    fn ids_of(geojson: &str) -> Vec<i64> {
        let parsed: Value = serde_json::from_str(geojson).unwrap();
        parsed["features"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|f| f["id"].as_i64())
            .collect()
    }

    fn names_of(geojson: &str) -> Vec<String> {
        let parsed: Value = serde_json::from_str(geojson).unwrap();
        parsed["features"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|f| f["properties"]["name"].as_str().map(String::from))
            .collect()
    }

    fn has_session(app: &App<MockRuntime>, id: &str) -> bool {
        app.state::<SourceStorage>()
            .store
            .lock()
            .unwrap()
            .get(id)
            .is_some_and(|e| e.session.is_some())
    }

    fn selected(app: &App<MockRuntime>) -> Vec<i64> {
        let mut ids = app.state::<SelectionStorage>().inner.lock().unwrap().get_ids();
        ids.sort();
        ids
    }

    // --- wire shapes ---

    #[test]
    fn op_json_shapes_deserialize() {
        let feature = serde_json::to_value(point(1.0, 1.0, json!({}))).unwrap();
        assert!(matches!(
            op(json!({ "type": "create", "drawId": "d1", "feature": feature })),
            EditOpInput::Create { draw_id, .. } if draw_id == "d1"
        ));
        assert!(matches!(
            op(json!({ "type": "update", "id": 7, "feature": feature })),
            EditOpInput::Update {
                id: EditRefInput::Id(7),
                ..
            }
        ));
        assert!(matches!(
            op(json!({ "type": "update", "id": "d1", "feature": feature })),
            EditOpInput::Update { id: EditRefInput::DrawId(d), .. } if d == "d1"
        ));
        assert!(matches!(
            op(json!({ "type": "delete", "id": 3 })),
            EditOpInput::Delete {
                id: EditRefInput::Id(3)
            }
        ));
        assert!(serde_json::from_value::<EditOpInput>(json!({ "type": "move", "id": 3 })).is_err());
    }

    #[test]
    fn scope_json_shapes_deserialize() {
        let ids: WorkingScope = serde_json::from_value(json!({ "type": "ids", "ids": [1, 2] })).unwrap();
        let bbox: WorkingScope =
            serde_json::from_value(json!({ "type": "bbox", "bbox": [0.0, 1.0, 2.0, 3.0] })).unwrap();
        assert!(matches!(ids, WorkingScope::Ids { ids } if ids == vec![1, 2]));
        assert!(matches!(bbox, WorkingScope::Bbox { bbox } if bbox == [0.0, 1.0, 2.0, 3.0]));
    }

    #[test]
    fn working_set_serializes_over_cap_in_camel_case() {
        let json = serde_json::to_value(WorkingSet {
            features: "{}".into(),
            over_cap: true,
        })
        .unwrap();
        assert_eq!(json, json!({ "features": "{}", "overCap": true }));
    }

    // --- begin ---

    #[tokio::test]
    async fn begin_rejects_a_missing_source() {
        let app = test_app();
        let err = draw_begin("nope".into(), app.state()).await.unwrap_err();
        assert_eq!(err, "Not found nope");
    }

    #[tokio::test]
    async fn begin_rejects_a_source_that_is_not_in_memory() {
        let app = test_app();
        add_file_source(&app, "file-source");
        let err = draw_begin("file-source".into(), app.state()).await.unwrap_err();
        assert_eq!(err, "Source file-source is not an in-memory source");
        assert!(!has_session(&app, "file-source"));
    }

    #[tokio::test]
    async fn begin_twice_is_rejected() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();
        let err = draw_begin(id.clone(), app.state()).await.unwrap_err();
        assert_eq!(err, format!("Source {id} already has a draw session"));
    }

    // --- no session ---

    #[tokio::test]
    async fn commands_without_a_session_are_rejected() {
        let app = test_app();
        let id = add_source(&app).await;
        let expected = format!("Source {id} has no draw session");

        let scope = WorkingScope::Ids { ids: vec![1] };
        let ws = draw_get_working_set(id.clone(), scope, CAP, app.state())
            .await
            .unwrap_err();
        let apply = draw_apply(id.clone(), create("d", 1.0, json!({})), app.state())
            .await
            .unwrap_err();
        let commit = draw_commit(id.clone(), app.state(), app.state()).await.unwrap_err();
        let rollback = draw_rollback(id.clone(), app.state(), app.state()).await.unwrap_err();

        assert_eq!(ws, expected);
        assert_eq!(apply, expected);
        assert_eq!(commit, expected);
        assert_eq!(rollback, expected);
        assert_eq!(ids_of(&source_get(id, app.state()).await.unwrap()), vec![1, 2, 3]);
    }

    #[tokio::test]
    async fn commands_on_a_missing_source_report_it() {
        let app = test_app();
        let apply = draw_apply("nope".into(), create("d", 1.0, json!({})), app.state())
            .await
            .unwrap_err();
        let commit = draw_commit("nope".into(), app.state(), app.state()).await.unwrap_err();
        assert_eq!(apply, "Not found nope");
        assert_eq!(commit, "Not found nope");
    }

    // --- working set ---

    #[tokio::test]
    async fn working_set_by_ids_keeps_order_and_skips_missing() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();

        let scope = WorkingScope::Ids { ids: vec![3, 99, 1] };
        let ws = draw_get_working_set(id, scope, CAP, app.state()).await.unwrap();

        assert!(!ws.over_cap);
        assert_eq!(ids_of(&ws.features), vec![3, 1]);
        let parsed: Value = serde_json::from_str(&ws.features).unwrap();
        assert_eq!(parsed["type"], "FeatureCollection");
    }

    #[tokio::test]
    async fn working_set_by_bbox_returns_intersecting_features_sorted() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();

        let scope = WorkingScope::Bbox {
            bbox: [5.0, 5.0, 25.0, 25.0],
        };
        let ws = draw_get_working_set(id, scope, CAP, app.state()).await.unwrap();

        assert!(!ws.over_cap);
        assert_eq!(ids_of(&ws.features), vec![2, 3]);
    }

    #[tokio::test]
    async fn working_set_over_cap_returns_the_flag_and_no_features() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();

        let by_bbox = WorkingScope::Bbox {
            bbox: [-1.0, -1.0, 21.0, 21.0],
        };
        let by_ids = WorkingScope::Ids { ids: vec![1, 2, 3] };
        let bbox_ws = draw_get_working_set(id.clone(), by_bbox, 2, app.state()).await.unwrap();
        let ids_ws = draw_get_working_set(id.clone(), by_ids, 2, app.state()).await.unwrap();
        let at_cap = WorkingScope::Ids { ids: vec![1, 2] };
        let at_cap_ws = draw_get_working_set(id, at_cap, 2, app.state()).await.unwrap();

        for ws in [&bbox_ws, &ids_ws] {
            assert!(ws.over_cap);
            assert!(ids_of(&ws.features).is_empty());
            let parsed: Value = serde_json::from_str(&ws.features).unwrap();
            assert_eq!(parsed["type"], "FeatureCollection");
        }
        assert!(!at_cap_ws.over_cap);
        assert_eq!(ids_of(&at_cap_ws.features), vec![1, 2]);
    }

    #[tokio::test]
    async fn working_set_sees_edits_made_in_the_session() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();
        let new_id = draw_apply(id.clone(), create("d", 15.0, json!({ "name": "n" })), app.state())
            .await
            .unwrap();
        draw_apply(id.clone(), op(json!({ "type": "delete", "id": 2 })), app.state())
            .await
            .unwrap();

        let scope = WorkingScope::Bbox {
            bbox: [5.0, 5.0, 25.0, 25.0],
        };
        let ws = draw_get_working_set(id, scope, CAP, app.state()).await.unwrap();

        assert_eq!(new_id, Some(4));
        assert_eq!(ids_of(&ws.features), vec![3, 4]);
    }

    // --- apply ---

    #[tokio::test]
    async fn apply_returns_ids_and_resolves_draw_ids() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();
        let moved = serde_json::to_value(point(30.0, 30.0, json!({ "name": "moved" }))).unwrap();

        let created = draw_apply(id.clone(), create("d1", 5.0, json!({})), app.state())
            .await
            .unwrap();
        let updated = draw_apply(
            id.clone(),
            op(json!({ "type": "update", "id": "d1", "feature": moved })),
            app.state(),
        )
        .await
        .unwrap();
        let deleted = draw_apply(id.clone(), op(json!({ "type": "delete", "id": 1 })), app.state())
            .await
            .unwrap();

        assert_eq!(created, Some(4));
        assert_eq!(updated, Some(4));
        assert_eq!(deleted, None);
    }

    #[tokio::test]
    async fn apply_reports_edit_errors() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();

        let missing = draw_apply(id.clone(), op(json!({ "type": "delete", "id": 99 })), app.state())
            .await
            .unwrap_err();
        let unknown = draw_apply(id, op(json!({ "type": "delete", "id": "zz" })), app.state())
            .await
            .unwrap_err();

        assert!(missing.contains("99"), "{missing}");
        assert!(unknown.contains("zz"), "{unknown}");
    }

    // --- commit ---

    #[tokio::test]
    async fn commit_keeps_edits_in_source_get_and_ends_the_session() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();
        let moved = serde_json::to_value(point(11.0, 11.0, json!({ "name": "b2" }))).unwrap();
        draw_apply(
            id.clone(),
            op(json!({ "type": "update", "id": 2, "feature": moved })),
            app.state(),
        )
        .await
        .unwrap();
        draw_apply(id.clone(), op(json!({ "type": "delete", "id": 1 })), app.state())
            .await
            .unwrap();
        draw_apply(id.clone(), create("d", 30.0, json!({ "name": "d" })), app.state())
            .await
            .unwrap();

        let touched = draw_commit(id.clone(), app.state(), app.state()).await.unwrap();

        assert_eq!(touched, vec![1, 2, 4]);
        assert!(!has_session(&app, &id));
        let geojson = source_get(id.clone(), app.state()).await.unwrap();
        assert_eq!(ids_of(&geojson), vec![2, 3, 4]);
        assert_eq!(names_of(&geojson), vec!["b2", "c", "d"]);
        let page = source_query_page(id.clone(), 0, 10, None, None, None, app.state())
            .await
            .unwrap();
        assert_eq!(page.total_matching, 3);
        assert_eq!(
            source_bounds(id.clone(), app.state()).await.unwrap(),
            (11.0, 11.0, 30.0, 30.0)
        );
        let again = draw_commit(id.clone(), app.state(), app.state()).await.unwrap_err();
        assert_eq!(again, format!("Source {id} has no draw session"));
        draw_begin(id, app.state()).await.unwrap();
    }

    #[tokio::test]
    async fn commit_refreshes_the_schema() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();
        draw_apply(id.clone(), create("d", 5.0, json!({ "height": 3 })), app.state())
            .await
            .unwrap();
        draw_apply(id.clone(), op(json!({ "type": "delete", "id": 1 })), app.state())
            .await
            .unwrap();

        draw_commit(id.clone(), app.state(), app.state()).await.unwrap();

        let schema = source_get_schema(id, app.state()).await.unwrap();
        assert_eq!(schema.columns.get("height").map(String::as_str), Some("Number"));
        assert_eq!(schema.features_count, 3);
    }

    #[tokio::test]
    async fn commit_drops_deleted_ids_from_the_selection() {
        let app = test_app();
        let id = add_source(&app).await;
        app.state::<SelectionStorage>().inner.lock().unwrap().set(&[1, 2]);
        draw_begin(id.clone(), app.state()).await.unwrap();
        draw_apply(id.clone(), op(json!({ "type": "delete", "id": 2 })), app.state())
            .await
            .unwrap();

        draw_commit(id, app.state(), app.state()).await.unwrap();

        assert_eq!(selected(&app), vec![1]);
    }

    // --- rollback ---

    #[tokio::test]
    async fn rollback_restores_the_source_and_ends_the_session() {
        let app = test_app();
        let id = add_source(&app).await;
        let before = source_get(id.clone(), app.state()).await.unwrap();
        let before_page = source_query_page(id.clone(), 0, 10, None, None, None, app.state())
            .await
            .unwrap();
        draw_begin(id.clone(), app.state()).await.unwrap();
        let moved = serde_json::to_value(point(50.0, 50.0, json!({ "name": "x" }))).unwrap();
        draw_apply(
            id.clone(),
            op(json!({ "type": "update", "id": 2, "feature": moved })),
            app.state(),
        )
        .await
        .unwrap();
        draw_apply(id.clone(), op(json!({ "type": "delete", "id": 1 })), app.state())
            .await
            .unwrap();
        draw_apply(id.clone(), create("d", 60.0, json!({})), app.state())
            .await
            .unwrap();

        let touched = draw_rollback(id.clone(), app.state(), app.state()).await.unwrap();

        assert_eq!(touched, vec![1, 2, 4]);
        assert!(!has_session(&app, &id));
        assert_eq!(source_get(id.clone(), app.state()).await.unwrap(), before);
        let page = source_query_page(id.clone(), 0, 10, Some("name".into()), None, None, app.state())
            .await
            .unwrap();
        assert_eq!(page.total_matching, before_page.total_matching);
        assert_eq!(
            source_bounds(id.clone(), app.state()).await.unwrap(),
            (0.0, 0.0, 20.0, 20.0)
        );
        let scope = WorkingScope::Bbox {
            bbox: [-1.0, -1.0, 100.0, 100.0],
        };
        draw_begin(id.clone(), app.state()).await.unwrap();
        let ws = draw_get_working_set(id, scope, CAP, app.state()).await.unwrap();
        assert_eq!(ids_of(&ws.features), vec![1, 2, 3]);
    }

    #[tokio::test]
    async fn rollback_removes_a_column_added_in_the_session_from_the_schema() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();
        draw_apply(id.clone(), create("d", 5.0, json!({ "height": 3 })), app.state())
            .await
            .unwrap();
        draw_commit(id.clone(), app.state(), app.state()).await.unwrap();
        assert!(
            source_get_schema(id.clone(), app.state())
                .await
                .unwrap()
                .columns
                .contains_key("height")
        );

        draw_begin(id.clone(), app.state()).await.unwrap();
        draw_apply(id.clone(), create("e", 6.0, json!({ "width": 1 })), app.state())
            .await
            .unwrap();
        draw_apply(id.clone(), op(json!({ "type": "delete", "id": 4 })), app.state())
            .await
            .unwrap();
        draw_rollback(id.clone(), app.state(), app.state()).await.unwrap();

        let schema = source_get_schema(id, app.state()).await.unwrap();
        assert!(!schema.columns.contains_key("width"));
        assert!(schema.columns.contains_key("height"));
        assert_eq!(schema.features_count, 4);
    }

    #[tokio::test]
    async fn rollback_drops_created_ids_from_the_selection() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();
        let new_id = draw_apply(id.clone(), create("d", 5.0, json!({})), app.state())
            .await
            .unwrap()
            .unwrap();
        app.state::<SelectionStorage>().inner.lock().unwrap().set(&[1, new_id]);

        draw_rollback(id, app.state(), app.state()).await.unwrap();

        assert_eq!(selected(&app), vec![1]);
    }

    // --- session lifetime ---

    #[tokio::test]
    async fn replacing_the_source_ends_the_session() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();
        let fc = FeatureCollection {
            bbox: None,
            features: vec![point(1.0, 1.0, json!({}))],
            foreign_members: None,
        };

        source_replace(id.clone(), fc, app.state()).await.unwrap();

        assert!(!has_session(&app, &id));
        draw_begin(id, app.state()).await.unwrap();
    }


    #[tokio::test]
    async fn removing_the_source_ends_the_session() {
        let app = test_app();
        let id = add_source(&app).await;
        draw_begin(id.clone(), app.state()).await.unwrap();

        let removed = app.state::<SourceStorage>().store.lock().unwrap().remove(&id).unwrap();

        assert!(removed.session.is_some(), "the session went with the entry");
        let err = draw_apply(id.clone(), create("d", 1.0, json!({})), app.state())
            .await
            .unwrap_err();
        assert_eq!(err, format!("Not found {id}"));
        app.state::<SourceStorage>()
            .store
            .lock()
            .unwrap()
            .insert(id.clone(), SourceEntry::new(removed.source, removed.store));
        draw_begin(id, app.state()).await.unwrap();
    }
}
