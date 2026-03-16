use libsphere::FeatureStore;
use libsphere::source::Source;
use std::collections::HashMap;
use std::sync::Mutex;

pub struct SourceEntry {
    pub source: Source,
    pub store: Option<FeatureStore>,
}

// here we use Mutex to achieve interior mutability
#[derive(Default)]
pub struct SourceStorage {
    pub store: Mutex<HashMap<String, SourceEntry>>,
}
