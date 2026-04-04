use std::collections::HashSet;

use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
pub struct SelectionDelta {
    pub added: Vec<i64>,
    pub removed: Vec<i64>,
}

#[derive(Debug, Clone)]
pub struct SelectionState {
    committed: HashSet<i64>,
    overlay: HashSet<i64>,
}

impl SelectionState {
    pub fn new() -> Self {
        Self {
            committed: HashSet::new(),
            overlay: HashSet::new(),
        }
    }

    fn effective(&self) -> HashSet<i64> {
        self.committed.union(&self.overlay).copied().collect()
    }

    fn delta(old: &HashSet<i64>, new: &HashSet<i64>) -> SelectionDelta {
        let added = new.difference(old).copied().collect();
        let removed = old.difference(new).copied().collect();
        SelectionDelta { added, removed }
    }

    pub fn set(&mut self, ids: &[i64]) -> SelectionDelta {
        let old = self.effective();
        self.committed = ids.iter().copied().collect();
        self.overlay = HashSet::new();
        let new = self.effective();
        Self::delta(&old, &new)
    }

    pub fn preview(&mut self, ids: &[i64]) -> SelectionDelta {
        let old = self.effective();
        self.overlay = ids.iter().copied().collect();
        let new = self.effective();
        Self::delta(&old, &new)
    }

    pub fn add(&mut self, ids: &[i64]) -> SelectionDelta {
        let old = self.effective();
        for id in ids {
            self.committed.insert(*id);
        }
        self.overlay = HashSet::new();
        let new = self.effective();
        Self::delta(&old, &new)
    }

    pub fn remove(&mut self, ids: &[i64]) -> SelectionDelta {
        let old = self.effective();
        for id in ids {
            self.committed.remove(id);
        }
        self.overlay = HashSet::new();
        let new = self.effective();
        Self::delta(&old, &new)
    }

    pub fn apply(&mut self) -> SelectionDelta {
        let old = self.effective();
        self.committed = self.effective();
        self.overlay = HashSet::new();
        let new = self.effective();
        Self::delta(&old, &new)
    }

    pub fn clear(&mut self) -> SelectionDelta {
        let old = self.effective();
        self.committed = HashSet::new();
        self.overlay = HashSet::new();
        let new = self.effective();
        Self::delta(&old, &new)
    }

    pub fn count(&self) -> usize {
        self.effective().len()
    }

    pub fn query_page(&self, offset: usize, limit: usize) -> Vec<i64> {
        let mut ids: Vec<i64> = self.effective().into_iter().collect();
        ids.sort();
        ids.into_iter().skip(offset).take(limit).collect()
    }

    pub fn get_ids(&self) -> Vec<i64> {
        self.effective().into_iter().collect()
    }
}

impl Default for SelectionState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sorted(mut v: Vec<i64>) -> Vec<i64> {
        v.sort();
        v
    }

    #[test]
    fn set_from_empty() {
        let mut s = SelectionState::new();
        let d = s.set(&[1, 2, 3]);
        assert_eq!(sorted(d.added), vec![1, 2, 3]);
        assert!(d.removed.is_empty());
    }

    #[test]
    fn set_replaces_existing() {
        let mut s = SelectionState::new();
        s.set(&[1, 2, 3]);
        let d = s.set(&[3, 4]);
        assert_eq!(sorted(d.added), vec![4]);
        assert_eq!(sorted(d.removed), vec![1, 2]);
    }

    #[test]
    fn set_identical_is_empty_delta() {
        let mut s = SelectionState::new();
        s.set(&[1, 2]);
        let d = s.set(&[1, 2]);
        assert!(d.added.is_empty());
        assert!(d.removed.is_empty());
    }

    #[test]
    fn preview_unions_with_committed() {
        let mut s = SelectionState::new();
        s.set(&[1, 2]);
        let d = s.preview(&[2, 3]);
        assert_eq!(sorted(d.added), vec![3]);
        assert!(d.removed.is_empty());
    }

    #[test]
    fn preview_repeated_does_not_accumulate() {
        let mut s = SelectionState::new();
        s.set(&[1]);
        s.preview(&[2, 3]);
        let d = s.preview(&[3, 4]);
        assert_eq!(sorted(d.added), vec![4]);
        assert_eq!(sorted(d.removed), vec![2]);
    }

    #[test]
    fn add_unions_into_committed() {
        let mut s = SelectionState::new();
        s.set(&[1, 2]);
        let d = s.add(&[2, 3]);
        assert_eq!(sorted(d.added), vec![3]);
        assert!(d.removed.is_empty());
    }

    #[test]
    fn add_duplicate_is_empty_delta() {
        let mut s = SelectionState::new();
        s.set(&[1, 2]);
        let d = s.add(&[1, 2]);
        assert!(d.added.is_empty());
        assert!(d.removed.is_empty());
    }

    #[test]
    fn remove_subtracts_from_committed() {
        let mut s = SelectionState::new();
        s.set(&[1, 2, 3]);
        let d = s.remove(&[2, 4]);
        assert!(d.added.is_empty());
        assert_eq!(sorted(d.removed), vec![2]);
    }

    #[test]
    fn apply_commits_preview() {
        let mut s = SelectionState::new();
        s.set(&[1]);
        s.preview(&[2, 3]);
        let d = s.apply();
        assert!(d.added.is_empty());
        assert!(d.removed.is_empty());
        assert_eq!(sorted(s.get_ids()), vec![1, 2, 3]);
    }

    #[test]
    fn clear_removes_all() {
        let mut s = SelectionState::new();
        s.set(&[1, 2, 3]);
        let d = s.clear();
        assert!(d.added.is_empty());
        assert_eq!(sorted(d.removed), vec![1, 2, 3]);
    }

    #[test]
    fn clear_empty_is_empty_delta() {
        let mut s = SelectionState::new();
        let d = s.clear();
        assert!(d.added.is_empty());
        assert!(d.removed.is_empty());
    }

    #[test]
    fn count_reflects_effective() {
        let mut s = SelectionState::new();
        s.set(&[1, 2]);
        assert_eq!(s.count(), 2);
        s.preview(&[3]);
        assert_eq!(s.count(), 3);
    }

    #[test]
    fn query_page_returns_slice() {
        let mut s = SelectionState::new();
        s.set(&[10, 20, 30, 40, 50]);
        let page = s.query_page(1, 2);
        assert_eq!(page.len(), 2);
        assert_eq!(page, vec![20, 30]);
    }

    #[test]
    fn query_page_beyond_end() {
        let mut s = SelectionState::new();
        s.set(&[1, 2]);
        let page = s.query_page(5, 10);
        assert!(page.is_empty());
    }

    #[test]
    fn preview_after_add_uses_new_committed() {
        let mut s = SelectionState::new();
        s.set(&[1]);
        s.add(&[2]);
        s.preview(&[3]);
        assert_eq!(sorted(s.get_ids()), vec![1, 2, 3]);
    }
}
