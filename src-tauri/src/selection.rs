use geojson::Feature;
use libsphere::SelectionState;
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Default)]
pub struct SelectionStorage {
    pub inner: Mutex<SelectionState>,
    pub generation: Mutex<u64>,
    pub feature_cache: Mutex<HashMap<i64, Feature>>,
}
