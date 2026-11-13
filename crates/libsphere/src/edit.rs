use std::collections::{BTreeMap, HashMap};

use geojson::feature::Id;
use geojson::Feature;

use crate::error::{Result, SphereError};
use crate::store::FeatureStore;

/// Reference to a feature in an edit op: a backend id or a draw-side id
/// previously registered by a `Create` in the same session.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EditRef {
    Id(i64),
    DrawId(String),
}

#[derive(Debug, Clone)]
pub enum EditOp {
    Create { draw_id: String, feature: Feature },
    Update { id: EditRef, feature: Feature },
    Delete { id: EditRef },
}

/// A batch of edits against a `FeatureStore` that can be committed or rolled back.
///
/// The journal keeps the pre-edit feature of each backend id on first touch
/// (`None` when the feature did not exist before the session).
#[derive(Default)]
pub struct EditSession {
    journal: BTreeMap<i64, Option<Feature>>,
    aliases: HashMap<String, i64>,
    next_id: i64,
}

fn edit_err(detail: impl Into<String>) -> SphereError {
    SphereError::Edit { detail: detail.into() }
}

impl EditSession {
    pub fn new() -> Self {
        Self::default()
    }

    /// Apply one op. Returns the backend id for `Create` and `Update`, `None` for `Delete`.
    pub fn apply(&mut self, store: &mut FeatureStore, op: EditOp) -> Result<Option<i64>> {
        match op {
            EditOp::Create { draw_id, mut feature } => {
                if self.aliases.contains_key(&draw_id) {
                    return Err(edit_err(format!("draw id already used: {draw_id}")));
                }
                let id = self.next_id.max(store.max_id().map_or(1, |m| m + 1));
                self.next_id = id + 1;
                feature.id = Some(Id::Number(id.into()));
                self.journal.insert(id, None);
                self.aliases.insert(draw_id, id);
                store.upsert(feature);
                Ok(Some(id))
            }
            EditOp::Update { id, mut feature } => {
                let id = self.resolve(&id)?;
                self.touch(store, id)?;
                feature.id = Some(Id::Number(id.into()));
                store.upsert(feature);
                Ok(Some(id))
            }
            EditOp::Delete { id } => {
                let id = self.resolve(&id)?;
                self.touch(store, id)?;
                store.remove(id);
                if matches!(self.journal.get(&id), Some(None)) {
                    // Created in this session: leave no trace.
                    self.journal.remove(&id);
                    self.aliases.retain(|_, v| *v != id);
                }
                Ok(None)
            }
        }
    }

    /// Keep the edits. Returns the touched backend ids, sorted and deduped: every
    /// pre-existing feature that was updated or deleted plus every created feature
    /// that still exists. Features created and deleted in-session are not included.
    pub fn commit(self) -> Vec<i64> {
        self.journal.into_keys().collect()
    }

    /// Undo every edit, restoring original features exactly. Returns the touched
    /// backend ids (same set as `commit` would).
    pub fn rollback(self, store: &mut FeatureStore) -> Vec<i64> {
        for (id, original) in &self.journal {
            match original {
                Some(f) => {
                    store.upsert(f.clone());
                }
                None => {
                    store.remove(*id);
                }
            }
        }
        self.journal.into_keys().collect()
    }

    fn resolve(&self, r: &EditRef) -> Result<i64> {
        match r {
            EditRef::Id(id) => Ok(*id),
            EditRef::DrawId(d) => self
                .aliases
                .get(d)
                .copied()
                .ok_or_else(|| edit_err(format!("unknown draw id: {d}"))),
        }
    }

    /// Journal the feature on first touch; errors when it does not exist.
    fn touch(&mut self, store: &FeatureStore, id: i64) -> Result<()> {
        let current = store.get_by_ids(&[id]).into_iter().next();
        let Some(current) = current else {
            return Err(edit_err(format!("feature not found: {id}")));
        };
        self.journal.entry(id).or_insert(Some(current));
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use geojson::{Geometry, Value};
    use serde_json::json;

    fn pt(id: Option<i64>, x: f64, name: &str) -> Feature {
        Feature {
            id: id.map(|i| Id::Number(i.into())),
            geometry: Some(Geometry::new(Value::Point(vec![x, x]))),
            properties: json!({"name": name}).as_object().cloned(),
            ..Default::default()
        }
    }

    fn store() -> FeatureStore {
        FeatureStore::from_features(vec![pt(Some(1), 0.0, "a"), pt(Some(2), 1.0, "b")])
    }

    fn snapshot(s: &FeatureStore) -> Vec<String> {
        let mut v: Vec<String> = s.features().map(|f| serde_json::to_string(f).unwrap()).collect();
        v.sort();
        v
    }

    fn create(d: &str) -> EditOp {
        EditOp::Create { draw_id: d.into(), feature: pt(None, 5.0, "new") }
    }

    #[test]
    fn create_assigns_next_id_and_rollback_removes() {
        let mut s = store();
        let before = snapshot(&s);
        let mut e = EditSession::new();
        assert_eq!(e.apply(&mut s, create("d1")).unwrap(), Some(3));
        assert_eq!(e.apply(&mut s, create("d2")).unwrap(), Some(4));
        assert_eq!(s.feature_count(), 4);
        assert_eq!(e.rollback(&mut s), vec![3, 4]);
        assert_eq!(snapshot(&s), before);
    }

    #[test]
    fn update_then_rollback_restores_original() {
        let mut s = store();
        let before = snapshot(&s);
        let mut e = EditSession::new();
        let op = |x| EditOp::Update { id: EditRef::Id(1), feature: pt(Some(1), x, "changed") };
        e.apply(&mut s, op(9.0)).unwrap();
        e.apply(&mut s, op(10.0)).unwrap();
        assert_ne!(snapshot(&s), before);
        e.rollback(&mut s);
        assert_eq!(snapshot(&s), before);
    }

    #[test]
    fn delete_then_rollback_restores() {
        let mut s = store();
        let before = snapshot(&s);
        let mut e = EditSession::new();
        e.apply(&mut s, EditOp::Delete { id: EditRef::Id(2) }).unwrap();
        assert_eq!(s.feature_count(), 1);
        e.rollback(&mut s);
        assert_eq!(snapshot(&s), before);
    }

    #[test]
    fn update_then_delete_then_rollback_restores_original() {
        let mut s = store();
        let before = snapshot(&s);
        let mut e = EditSession::new();
        e.apply(&mut s, EditOp::Update { id: EditRef::Id(1), feature: pt(Some(1), 7.0, "x") }).unwrap();
        e.apply(&mut s, EditOp::Delete { id: EditRef::Id(1) }).unwrap();
        e.rollback(&mut s);
        assert_eq!(snapshot(&s), before);
    }

    #[test]
    fn create_then_delete_leaves_no_trace_on_commit_and_rollback() {
        for rollback in [false, true] {
            let mut s = store();
            let before = snapshot(&s);
            let mut e = EditSession::new();
            e.apply(&mut s, create("d")).unwrap();
            e.apply(&mut s, EditOp::Delete { id: EditRef::DrawId("d".into()) }).unwrap();
            let touched = if rollback { e.rollback(&mut s) } else { e.commit() };
            assert!(touched.is_empty());
            assert_eq!(snapshot(&s), before);
        }
    }

    #[test]
    fn commit_returns_sorted_deduped_touched_ids() {
        let mut s = store();
        let mut e = EditSession::new();
        e.apply(&mut s, create("d")).unwrap();
        e.apply(&mut s, EditOp::Update { id: EditRef::Id(2), feature: pt(Some(2), 3.0, "u") }).unwrap();
        e.apply(&mut s, EditOp::Update { id: EditRef::Id(2), feature: pt(Some(2), 4.0, "u") }).unwrap();
        e.apply(&mut s, EditOp::Delete { id: EditRef::Id(1) }).unwrap();
        assert_eq!(e.commit(), vec![1, 2, 3]);
        assert_eq!(s.feature_count(), 2);
    }

    #[test]
    fn draw_id_alias_resolves_on_later_ops() {
        let mut s = store();
        let mut e = EditSession::new();
        e.apply(&mut s, create("abc")).unwrap();
        let id = e
            .apply(&mut s, EditOp::Update { id: EditRef::DrawId("abc".into()), feature: pt(None, 6.0, "moved") })
            .unwrap();
        assert_eq!(id, Some(3));
        let got = s.get_by_ids(&[3]);
        assert_eq!(got[0].properties.as_ref().unwrap()["name"], "moved");
        assert_eq!(s.feature_count(), 3);
    }

    #[test]
    fn ids_are_not_reused_within_session() {
        let mut s = store();
        let mut e = EditSession::new();
        assert_eq!(e.apply(&mut s, create("a")).unwrap(), Some(3));
        e.apply(&mut s, EditOp::Delete { id: EditRef::DrawId("a".into()) }).unwrap();
        assert_eq!(e.apply(&mut s, create("b")).unwrap(), Some(4));
    }

    #[test]
    fn errors_instead_of_panics() {
        let mut s = store();
        let mut e = EditSession::new();
        assert!(e.apply(&mut s, EditOp::Delete { id: EditRef::Id(99) }).is_err());
        assert!(e.apply(&mut s, EditOp::Delete { id: EditRef::DrawId("nope".into()) }).is_err());
        assert!(e.apply(&mut s, EditOp::Update { id: EditRef::Id(99), feature: pt(Some(99), 0.0, "x") }).is_err());
        e.apply(&mut s, create("d")).unwrap();
        assert!(e.apply(&mut s, create("d")).is_err());
    }

    #[test]
    fn empty_session_commit_and_rollback() {
        let mut s = store();
        let before = snapshot(&s);
        assert!(EditSession::new().commit().is_empty());
        assert!(EditSession::new().rollback(&mut s).is_empty());
        assert_eq!(snapshot(&s), before);
    }

    #[test]
    fn create_in_empty_store_starts_at_one() {
        let mut s = FeatureStore::from_features(vec![]);
        let mut e = EditSession::new();
        assert_eq!(e.apply(&mut s, create("d")).unwrap(), Some(1));
    }
}
