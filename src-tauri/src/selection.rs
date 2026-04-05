use libsphere::SelectionState;
use std::sync::Mutex;

#[derive(Default)]
pub struct SelectionStorage {
    pub inner: Mutex<SelectionState>,
    pub generation: Mutex<u64>,
}
