use libsphere::source::Source;
use libsphere::{EditSession, FeatureStore};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, RwLock};

/// A feature store shared with readers that work outside the `SourceStorage` lock.
/// Readers clone the `Arc` and take a read lock; draw edits take a write lock, so a
/// store is edited in place instead of being copied.
pub type SharedFeatureStore = Arc<RwLock<FeatureStore>>;

pub fn shared_feature_store(store: FeatureStore) -> SharedFeatureStore {
    Arc::new(RwLock::new(store))
}

pub struct SourceEntry {
    pub source: Source,
    pub store: Option<SharedFeatureStore>,
    /// Active draw session, if any. It lives in the entry so that removing or
    /// replacing the entry ends it.
    pub session: Option<EditSession>,
}

impl SourceEntry {
    pub fn new(source: Source, store: Option<SharedFeatureStore>) -> Self {
        Self {
            source,
            store,
            session: None,
        }
    }
}

// here we use Mutex to achieve interior mutability
#[derive(Default)]
pub struct SourceStorage {
    pub store: Mutex<HashMap<String, SourceEntry>>,
}
