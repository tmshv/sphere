use libsphere::source::Source;
use std::collections::HashMap;
use std::sync::Mutex;

// here we use Mutex to achieve interior mutability
#[derive(Default)]
pub struct SourceStorage {
    pub store: Mutex<HashMap<String, Source>>,
}
