use libsphere::SelectionState;
use std::sync::Mutex;

#[derive(Default)]
pub struct SelectionStorage {
    pub state: Mutex<SelectionState>,
}
