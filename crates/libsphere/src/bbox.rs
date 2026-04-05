use crate::index::{Bbox, Point2};

/// Extends `Bbox` with geometric operations.
pub trait BboxOps {
    /// Expands this bbox so that `point` lies within it.
    fn update_bounds(&mut self, point: Point2);
}

impl BboxOps for Bbox {
    fn update_bounds(&mut self, point: Point2) {
        let (lon, lat) = point;
        if lon < self.0 {
            self.0 = lon;
        }
        if lat < self.1 {
            self.1 = lat;
        }
        if lon > self.2 {
            self.2 = lon;
        }
        if lat > self.3 {
            self.3 = lat;
        }
    }
}
