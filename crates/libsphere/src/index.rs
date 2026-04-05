use rstar::{RTree, RTreeObject, AABB};

/// Bounding box as (west, south, east, north).
pub type Bbox = (f64, f64, f64, f64);

/// 2D point as (x, y) / (lon, lat).
pub type Point2 = (f64, f64);

/// Trait for spatial index implementations.
/// Designed so a future SQLite R*Tree impl can be added without changing call sites.
pub trait SpatialIndex: Send + Sync {
    /// Insert a feature by its index in the feature vec and its bbox.
    fn insert(&mut self, idx: usize, bbox: Bbox);
    /// Return feature indices whose bbox intersects the query bbox.
    fn query_bbox(&self, bbox: Bbox) -> Vec<usize>;
}

#[derive(Clone)]
struct IndexEntry {
    idx: usize,
    envelope: AABB<[f64; 2]>,
}

impl RTreeObject for IndexEntry {
    type Envelope = AABB<[f64; 2]>;

    fn envelope(&self) -> Self::Envelope {
        self.envelope
    }
}

pub struct RstarIndex {
    tree: RTree<IndexEntry>,
}

impl RstarIndex {
    pub fn new() -> Self {
        Self {
            tree: RTree::new(),
        }
    }

    /// Build an index from a batch of (idx, bbox) pairs using bulk-load for efficiency.
    pub fn build(entries: Vec<(usize, Bbox)>) -> Self {
        let items: Vec<IndexEntry> = entries
            .into_iter()
            .map(|(idx, bbox)| IndexEntry {
                idx,
                envelope: AABB::from_corners([bbox.0, bbox.1], [bbox.2, bbox.3]),
            })
            .collect();
        Self {
            tree: RTree::bulk_load(items),
        }
    }
}

impl Default for RstarIndex {
    fn default() -> Self {
        Self::new()
    }
}

impl SpatialIndex for RstarIndex {
    fn insert(&mut self, idx: usize, bbox: Bbox) {
        self.tree.insert(IndexEntry {
            idx,
            envelope: AABB::from_corners([bbox.0, bbox.1], [bbox.2, bbox.3]),
        });
    }

    fn query_bbox(&self, bbox: Bbox) -> Vec<usize> {
        let query_envelope = AABB::from_corners([bbox.0, bbox.1], [bbox.2, bbox.3]);
        self.tree
            .locate_in_envelope_intersecting(&query_envelope)
            .map(|e| e.idx)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rstar_insert_and_query() {
        let mut index = RstarIndex::new();
        index.insert(0, (0.0, 0.0, 1.0, 1.0));
        index.insert(1, (5.0, 5.0, 6.0, 6.0));
        index.insert(2, (0.5, 0.5, 1.5, 1.5));

        let mut results = index.query_bbox((0.0, 0.0, 1.0, 1.0));
        results.sort();
        assert!(results.contains(&0));
        assert!(results.contains(&2));
        assert!(!results.contains(&1));
    }

    #[test]
    fn test_rstar_bulk_load_and_query() {
        let entries = vec![
            (0, (0.0, 0.0, 1.0, 1.0)),
            (1, (5.0, 5.0, 6.0, 6.0)),
            (2, (10.0, 10.0, 11.0, 11.0)),
        ];
        let index = RstarIndex::build(entries);
        let mut results = index.query_bbox((4.5, 4.5, 6.5, 6.5));
        results.sort();
        assert_eq!(results, vec![1]);
    }

    #[test]
    fn test_rstar_no_results_outside_bbox() {
        let index = RstarIndex::build(vec![(0, (0.0, 0.0, 1.0, 1.0))]);
        let results = index.query_bbox((10.0, 10.0, 11.0, 11.0));
        assert!(results.is_empty());
    }

    #[test]
    fn test_rstar_empty_index() {
        let index = RstarIndex::new();
        let results = index.query_bbox((0.0, 0.0, 100.0, 100.0));
        assert!(results.is_empty());
    }
}
