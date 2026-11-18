use geo::Intersects;
use geojson::Feature;
use std::panic::{catch_unwind, AssertUnwindSafe};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;

use libexpression::{EvalContext, Expr, Value as ExprValue};

use crate::bbox::{Bbox, BboxOps};
use crate::index::{RstarIndex, SpatialIndex};
use crate::schema::{infer_source_schema, SourceSchema};

#[derive(Debug, Serialize)]
pub struct PageResult {
    pub features: Vec<Value>,
    pub total_matching: u64,
    pub offset: u64,
    pub limit: u64,
}

pub struct FeatureStore {
    /// Slots; `None` is a tombstone left by `remove` so other indices stay valid.
    features: Vec<Option<Feature>>,
    id_to_idx: HashMap<i64, usize>,
    live_count: usize,
    feature_ids: Vec<Option<i64>>,
    feature_bboxes: Vec<Option<Bbox>>,
    index: Box<dyn SpatialIndex>,
    schema: SourceSchema,
    bounds: Option<Bbox>,
    /// Two input features shared an integer id. `id_to_idx` keeps only the last
    /// of them, so id-addressed edits would hit the wrong feature. `upsert` and
    /// `remove` never add a duplicate, so this is settled at construction.
    duplicate_ids: bool,
}

/// `query_rect` mode: the feature's bbox lies fully inside the rect.
const RECT_MODE_INCLUDE: &str = "include";
/// `query_rect` mode: the feature's geometry touches the rect.
const RECT_MODE_INTERSECT: &str = "intersect";

impl FeatureStore {
    pub fn from_features(features: Vec<Feature>) -> Self {
        let schema = infer_source_schema(features.iter());

        let mut entries = Vec::with_capacity(features.len());
        let mut feature_bboxes: Vec<Option<Bbox>> = Vec::with_capacity(features.len());
        let mut feature_ids: Vec<Option<i64>> = Vec::with_capacity(features.len());
        let mut overall_bbox: Option<Bbox> = None;

        for (idx, feature) in features.iter().enumerate() {
            let fb = compute_feature_bbox(feature);
            feature_bboxes.push(fb);
            feature_ids.push(feature_id_i64(feature));
            if let Some(bbox) = fb {
                entries.push((idx, bbox));
                overall_bbox = Some(match overall_bbox {
                    None => bbox,
                    Some(ob) => (
                        ob.0.min(bbox.0),
                        ob.1.min(bbox.1),
                        ob.2.max(bbox.2),
                        ob.3.max(bbox.3),
                    ),
                });
            }
        }

        let index = Box::new(RstarIndex::build(entries));

        let id_to_idx: HashMap<i64, usize> = feature_ids
            .iter()
            .enumerate()
            .filter_map(|(idx, id)| id.map(|id| (id, idx)))
            .collect();
        let duplicate_ids = id_to_idx.len() != feature_ids.iter().flatten().count();
        let live_count = features.len();

        Self {
            features: features.into_iter().map(Some).collect(),
            id_to_idx,
            live_count,
            feature_ids,
            feature_bboxes,
            index,
            schema,
            bounds: overall_bbox,
            duplicate_ids,
        }
    }

    /// Whether two features were built with the same integer id. Such a store
    /// cannot be edited by id safely.
    pub fn has_duplicate_ids(&self) -> bool {
        self.duplicate_ids
    }

    /// Paginated query with optional MapLibre expression filter.
    /// Returns features, total matching count, and page metadata.
    pub fn query_page(
        &self,
        offset: u64,
        limit: u64,
        filter: Option<&Expr>,
        sort_column: Option<&str>,
        sort_asc: bool,
    ) -> PageResult {
        let mut matching_indices: Vec<usize> = (0..self.features.len())
            .filter(|&idx| {
                let Some(feature) = self.features[idx].as_ref() else {
                    return false;
                };
                match filter {
                    None => true,
                    Some(expr) => {
                        let props: HashMap<String, ExprValue> = feature
                            .properties
                            .as_ref()
                            .map(|p| {
                                p.iter()
                                    .map(|(k, v)| (k.clone(), ExprValue::from(v.clone())))
                                    .collect()
                            })
                            .unwrap_or_default();
                        let feature_id = feature_id_value(feature);
                        let feature_type = geometry_type_str(feature);
                        let ctx = EvalContext {
                            feature_id,
                            feature_type,
                            properties: &props,
                        };
                        match expr.evaluate(&ctx) {
                            Ok(ExprValue::Bool(b)) => b,
                            Ok(ExprValue::Null) => false,
                            Ok(ExprValue::Number(f)) => f != 0.0,
                            Ok(_) => false,
                            Err(_) => false,
                        }
                    }
                }
            })
            .collect();

        if let Some(col) = sort_column {
            matching_indices.sort_by(|&a, &b| {
                let val_a = self.features[a].as_ref().and_then(|f| get_property_value(f, col));
                let val_b = self.features[b].as_ref().and_then(|f| get_property_value(f, col));
                let ord = compare_values(val_a, val_b);
                if sort_asc { ord } else { ord.reverse() }
            });
        }

        let total_matching = matching_indices.len() as u64;

        let page: Vec<Value> = matching_indices
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .filter_map(|idx| serde_json::to_value(self.features[idx].as_ref()?).ok())
            .collect();

        PageResult {
            features: page,
            total_matching,
            offset,
            limit,
        }
    }

    /// Live features in slot order (tombstones skipped).
    pub fn features(&self) -> impl Iterator<Item = &Feature> {
        self.features.iter().filter_map(|f| f.as_ref())
    }

    /// Insert or replace the feature with the same id. Returns the previous version.
    /// Features without an integer id cannot be addressed: they are ignored and
    /// `None` is returned.
    pub fn upsert(&mut self, feature: Feature) -> Option<Feature> {
        let id = feature_id_i64(&feature)?;
        let previous = self.remove_inner(id);
        let bbox = compute_feature_bbox(&feature);
        let idx = self.features.len();
        self.features.push(Some(feature));
        self.feature_ids.push(Some(id));
        self.feature_bboxes.push(bbox);
        self.id_to_idx.insert(id, idx);
        self.live_count += 1;
        if let Some(b) = bbox {
            self.index.insert(idx, b);
            self.bounds = Some(match self.bounds {
                None => b,
                Some(ob) => (ob.0.min(b.0), ob.1.min(b.1), ob.2.max(b.2), ob.3.max(b.3)),
            });
        }
        previous
    }

    /// Remove the feature with the given id, leaving a tombstone. Returns it.
    pub fn remove(&mut self, id: i64) -> Option<Feature> {
        self.remove_inner(id)
    }

    /// Largest live integer feature id, if any.
    pub fn max_id(&self) -> Option<i64> {
        self.id_to_idx.keys().copied().max()
    }

    /// Features for the given ids, in the order requested; missing ids are skipped.
    pub fn get_by_ids(&self, ids: &[i64]) -> Vec<Feature> {
        ids.iter()
            .filter_map(|id| {
                let idx = *self.id_to_idx.get(id)?;
                self.features.get(idx)?.clone()
            })
            .collect()
    }

    fn remove_inner(&mut self, id: i64) -> Option<Feature> {
        let idx = self.id_to_idx.remove(&id)?;
        let feature = self.features[idx].take()?;
        self.feature_ids[idx] = None;
        let bbox = self.feature_bboxes[idx].take();
        self.live_count -= 1;
        if let Some(b) = bbox {
            self.index.remove(idx, b);
            if self.bounds.is_some_and(|ob| touches_edge(ob, b)) {
                self.bounds = self.recompute_bounds();
            }
        }
        Some(feature)
    }

    fn recompute_bounds(&self) -> Option<Bbox> {
        self.feature_bboxes.iter().flatten().fold(None, |acc, b| {
            Some(match acc {
                None => *b,
                Some(ob) => (ob.0.min(b.0), ob.1.min(b.1), ob.2.max(b.2), ob.3.max(b.3)),
            })
        })
    }

    /// Returns all features that match the given filter expression as JSON values.
    /// When `filter` is None, all features are returned.
    pub fn get_filtered(&self, filter: Option<&Expr>) -> Vec<Value> {
        let result = self.query_page(0, u64::MAX, filter, None, true);
        result.features
    }

    pub fn feature_count(&self) -> u64 {
        self.live_count as u64
    }

    pub fn get_bounds(&self) -> Option<Bbox> {
        self.bounds
    }

    /// Schema as of construction or the last `refresh_schema`; `upsert` and
    /// `remove` do not update it.
    pub fn schema(&self) -> &SourceSchema {
        &self.schema
    }

    /// Re-infer the schema (columns and geometry counts) from the live features.
    /// One pass over every feature.
    pub fn refresh_schema(&mut self) {
        let schema = infer_source_schema(self.features());
        self.schema = schema;
    }

    /// Returns IDs of features that match the given rect and mode.
    /// mode: "include" = feature bbox fully inside rect (exact for polygon selection).
    /// mode: "intersect" = feature geometry intersects rect (geometric test, invalid
    /// geometries that would panic in geo's relate algorithm are skipped).
    pub fn query_rect(&self, bbox: [f64; 4], mode: &str) -> Vec<i64> {
        let [west, south, east, north] = bbox;
        let candidates = self.index.query_bbox((west, south, east, north));
        let mut result = Vec::with_capacity(candidates.len());
        let rect = geo::Rect::new(
            geo::coord! { x: west, y: south },
            geo::coord! { x: east, y: north },
        );
        for idx in candidates {
            let id = match self.feature_ids[idx] {
                Some(v) => v,
                None => continue,
            };
            let matches = match mode {
                "include" => {
                    let fb = match self.feature_bboxes[idx] {
                        Some(b) => b,
                        None => continue,
                    };
                    fb.0 >= west && fb.1 >= south && fb.2 <= east && fb.3 <= north
                }
                "intersect" => {
                    let geometry = match self.features[idx].as_ref().and_then(|f| f.geometry.as_ref()) {
                        Some(g) => g,
                        None => continue,
                    };
                    let geo_geom: geo::Geometry<f64> = match geo::Geometry::try_from(geometry) {
                        Ok(g) => g,
                        Err(_) => continue,
                    };
                    match catch_unwind(AssertUnwindSafe(|| rect.intersects(&geo_geom))) {
                        Ok(v) => v,
                        Err(_) => continue,
                    }
                }
                _ => false,
            };
            if matches {
                result.push(id);
            }
        }
        result.sort();
        result
    }

    /// `query_rect` that gives up once more than `limit` features match: returns
    /// the matching ids, sorted, and `false`, or at most `limit` of them and
    /// `true` when there are more. The spatial index is walked lazily and a
    /// candidate whose bbox lies inside the rect matches without a geometry test,
    /// so a rect over a huge source costs about `limit` candidates, not all of them.
    pub fn query_rect_limited(&self, bbox: [f64; 4], mode: &str, limit: usize) -> (Vec<i64>, bool) {
        let [west, south, east, north] = bbox;
        let rect = geo::Rect::new(
            geo::coord! { x: west, y: south },
            geo::coord! { x: east, y: north },
        );
        let mut result = Vec::new();
        let mut over_limit = false;
        for idx in self.index.query_bbox_iter((west, south, east, north)) {
            let (Some(id), Some(fb)) = (self.feature_ids[idx], self.feature_bboxes[idx]) else {
                continue;
            };
            let inside = fb.0 >= west && fb.1 >= south && fb.2 <= east && fb.3 <= north;
            let matches = match mode {
                RECT_MODE_INCLUDE => inside,
                RECT_MODE_INTERSECT => self.has_geometry(idx) && (inside || self.intersects_rect(idx, &rect)),
                _ => false,
            };
            if !matches {
                continue;
            }
            if result.len() == limit {
                over_limit = true;
                break;
            }
            result.push(id);
        }
        result.sort();
        (result, over_limit)
    }

    fn has_geometry(&self, idx: usize) -> bool {
        self.features[idx].as_ref().and_then(|f| f.geometry.as_ref()).is_some()
    }

    /// Exact geometry test against `rect`. Geometries that fail to convert, or
    /// that would panic in geo's relate algorithm, do not match.
    fn intersects_rect(&self, idx: usize, rect: &geo::Rect<f64>) -> bool {
        let Some(geometry) = self.features[idx].as_ref().and_then(|f| f.geometry.as_ref()) else {
            return false;
        };
        let Ok(geo_geom) = geo::Geometry::<f64>::try_from(geometry) else {
            return false;
        };
        catch_unwind(AssertUnwindSafe(|| rect.intersects(&geo_geom))).unwrap_or(false)
    }
}

fn touches_edge(outer: Bbox, inner: Bbox) -> bool {
    inner.0 <= outer.0 || inner.1 <= outer.1 || inner.2 >= outer.2 || inner.3 >= outer.3
}

fn feature_id_i64(feature: &Feature) -> Option<i64> {
    match &feature.id {
        Some(geojson::feature::Id::Number(n)) => n.as_i64(),
        _ => None,
    }
}

fn geometry_type_str(feature: &Feature) -> &'static str {
    match feature.geometry.as_ref().map(|g| &g.value) {
        Some(geojson::Value::Point(_)) => "Point",
        Some(geojson::Value::MultiPoint(_)) => "MultiPoint",
        Some(geojson::Value::LineString(_)) => "LineString",
        Some(geojson::Value::MultiLineString(_)) => "MultiLineString",
        Some(geojson::Value::Polygon(_)) => "Polygon",
        Some(geojson::Value::MultiPolygon(_)) => "MultiPolygon",
        Some(geojson::Value::GeometryCollection(_)) => "GeometryCollection",
        None => "Unknown",
    }
}

fn feature_id_value(feature: &Feature) -> Option<ExprValue> {
    match &feature.id {
        Some(geojson::feature::Id::Number(n)) => n.as_f64().map(ExprValue::Number),
        Some(geojson::feature::Id::String(s)) => Some(ExprValue::String(s.clone())),
        None => None,
    }
}

fn compute_feature_bbox(feature: &Feature) -> Option<Bbox> {
    if let Some(bbox) = &feature.bbox {
        if bbox.len() == 4 {
            return Some((bbox[0], bbox[1], bbox[2], bbox[3]));
        }
    }
    feature
        .geometry
        .as_ref()
        .and_then(|g| bbox_from_geometry_value(&g.value))
}

fn bbox_from_geometry_value(value: &geojson::Value) -> Option<Bbox> {
    let mut bbox: Bbox = (
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    );
    if collect_coords(value, &mut bbox) {
        Some(bbox)
    } else {
        None
    }
}

fn collect_coords(value: &geojson::Value, bbox: &mut Bbox) -> bool {
    match value {
        geojson::Value::Point(pt) => {
            if pt.len() >= 2 {
                bbox.update_bounds((pt[0], pt[1]));
                true
            } else {
                false
            }
        }
        geojson::Value::MultiPoint(pts) => {
            let mut any = false;
            for pt in pts {
                if pt.len() >= 2 {
                    bbox.update_bounds((pt[0], pt[1]));
                    any = true;
                }
            }
            any
        }
        geojson::Value::LineString(pts) => {
            let mut any = false;
            for pt in pts {
                if pt.len() >= 2 {
                    bbox.update_bounds((pt[0], pt[1]));
                    any = true;
                }
            }
            any
        }
        geojson::Value::MultiLineString(lines) => {
            let mut any = false;
            for line in lines {
                for pt in line {
                    if pt.len() >= 2 {
                        bbox.update_bounds((pt[0], pt[1]));
                        any = true;
                    }
                }
            }
            any
        }
        geojson::Value::Polygon(rings) => {
            let mut any = false;
            for ring in rings {
                for pt in ring {
                    if pt.len() >= 2 {
                        bbox.update_bounds((pt[0], pt[1]));
                        any = true;
                    }
                }
            }
            any
        }
        geojson::Value::MultiPolygon(polys) => {
            let mut any = false;
            for poly in polys {
                for ring in poly {
                    for pt in ring {
                        if pt.len() >= 2 {
                            bbox.update_bounds((pt[0], pt[1]));
                            any = true;
                        }
                    }
                }
            }
            any
        }
        geojson::Value::GeometryCollection(geoms) => {
            let mut any = false;
            for geom in geoms {
                if collect_coords(&geom.value, bbox) {
                    any = true;
                }
            }
            any
        }
    }
}


fn get_property_value<'a>(feature: &'a Feature, col: &str) -> Option<&'a Value> {
    feature.properties.as_ref().and_then(|p| p.get(col))
}

fn compare_values(a: Option<&Value>, b: Option<&Value>) -> std::cmp::Ordering {
    use std::cmp::Ordering;
    match (a, b) {
        (None, None) => Ordering::Equal,
        (None, Some(_)) => Ordering::Less,
        (Some(_), None) => Ordering::Greater,
        (Some(a), Some(b)) => match (a, b) {
            (Value::Number(na), Value::Number(nb)) => {
                let fa = na.as_f64().unwrap_or(f64::NEG_INFINITY);
                let fb = nb.as_f64().unwrap_or(f64::NEG_INFINITY);
                fa.partial_cmp(&fb).unwrap_or(Ordering::Equal)
            }
            (Value::String(sa), Value::String(sb)) => sa.cmp(sb),
            _ => a.to_string().cmp(&b.to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bbox::Point2;
    use geojson::{Feature, Geometry, Value as GeoValue};
    use serde_json::json;

    fn make_point_feature(lon: f64, lat: f64, props: Value) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![lon, lat]))),
            id: None,
            properties: props.as_object().cloned(),
            foreign_members: None,
        }
    }

    fn make_features() -> Vec<Feature> {
        vec![
            make_point_feature(0.0, 0.0, json!({"name": "Alpha", "score": 10, "type": "airport"})),
            make_point_feature(1.0, 1.0, json!({"name": "Beta", "score": 30, "type": "airport"})),
            make_point_feature(2.0, 2.0, json!({"name": "Gamma", "score": 20, "type": "helipad"})),
            make_point_feature(3.0, 3.0, json!({"name": "Delta", "score": 5, "type": "airport"})),
            make_point_feature(4.0, 4.0, json!({"name": "Epsilon", "score": 50, "type": "helipad"})),
        ]
    }

    #[test]
    fn refresh_schema_reflects_upserts_and_removes() {
        let mut features = make_features();
        for (i, f) in features.iter_mut().enumerate() {
            f.id = Some(geojson::feature::Id::Number((i as i64 + 1).into()));
        }
        let mut store = FeatureStore::from_features(features);
        let mut extra = make_point_feature(9.0, 9.0, json!({"height": 3}));
        extra.id = Some(geojson::feature::Id::Number(9.into()));
        store.upsert(extra);
        store.remove(1);
        assert!(!store.schema().columns.contains_key("height"));

        store.refresh_schema();

        assert_eq!(store.schema().columns.get("height").map(String::as_str), Some("Number"));
        assert_eq!(store.schema().features_count, 5);
        assert_eq!(store.schema().points_count, 5);

        store.remove(9);
        store.refresh_schema();
        assert!(!store.schema().columns.contains_key("height"));
        assert_eq!(store.schema().features_count, 4);
    }

    #[test]
    fn test_feature_count() {
        let store = FeatureStore::from_features(make_features());
        assert_eq!(store.feature_count(), 5);
    }

    #[test]
    fn test_get_bounds() {
        let store = FeatureStore::from_features(make_features());
        let bounds = store.get_bounds().expect("bounds should exist");
        assert_eq!(bounds, (0.0, 0.0, 4.0, 4.0));
    }

    #[test]
    fn test_get_bounds_empty() {
        let store = FeatureStore::from_features(vec![]);
        assert!(store.get_bounds().is_none());
    }

    #[test]
    fn test_query_page_no_filter_all() {
        let store = FeatureStore::from_features(make_features());
        let result = store.query_page(0, 10, None, None, true);
        assert_eq!(result.total_matching, 5);
        assert_eq!(result.features.len(), 5);
        assert_eq!(result.offset, 0);
        assert_eq!(result.limit, 10);
    }

    #[test]
    fn test_query_page_pagination() {
        let store = FeatureStore::from_features(make_features());
        let result = store.query_page(2, 2, None, None, true);
        assert_eq!(result.total_matching, 5);
        assert_eq!(result.features.len(), 2);
    }

    #[test]
    fn test_query_page_offset_beyond_end() {
        let store = FeatureStore::from_features(make_features());
        let result = store.query_page(10, 10, None, None, true);
        assert_eq!(result.total_matching, 5);
        assert_eq!(result.features.len(), 0);
    }

    #[test]
    fn test_query_page_with_filter() {
        let store = FeatureStore::from_features(make_features());
        let filter_json = json!(["==", ["get", "type"], "airport"]);
        let filter = libexpression::parse(filter_json).expect("parse failed");
        let result = store.query_page(0, 10, Some(&filter), None, true);
        assert_eq!(result.total_matching, 3);
        assert_eq!(result.features.len(), 3);
        for feature in &result.features {
            let t = feature["properties"]["type"].as_str().unwrap();
            assert_eq!(t, "airport");
        }
    }

    #[test]
    fn test_query_page_with_filter_no_match() {
        let store = FeatureStore::from_features(make_features());
        let filter_json = json!(["==", ["get", "type"], "nonexistent"]);
        let filter = libexpression::parse(filter_json).expect("parse failed");
        let result = store.query_page(0, 10, Some(&filter), None, true);
        assert_eq!(result.total_matching, 0);
        assert_eq!(result.features.len(), 0);
    }

    #[test]
    fn test_query_page_sort_asc() {
        let store = FeatureStore::from_features(make_features());
        let result = store.query_page(0, 5, None, Some("score"), true);
        let scores: Vec<f64> = result.features.iter()
            .map(|f| f["properties"]["score"].as_f64().unwrap())
            .collect();
        assert_eq!(scores, vec![5.0, 10.0, 20.0, 30.0, 50.0]);
    }

    #[test]
    fn test_query_page_sort_desc() {
        let store = FeatureStore::from_features(make_features());
        let result = store.query_page(0, 5, None, Some("score"), false);
        let scores: Vec<f64> = result.features.iter()
            .map(|f| f["properties"]["score"].as_f64().unwrap())
            .collect();
        assert_eq!(scores, vec![50.0, 30.0, 20.0, 10.0, 5.0]);
    }

    #[test]
    fn test_query_page_sort_string_asc() {
        let store = FeatureStore::from_features(make_features());
        let result = store.query_page(0, 5, None, Some("name"), true);
        let names: Vec<&str> = result.features.iter()
            .map(|f| f["properties"]["name"].as_str().unwrap())
            .collect();
        assert_eq!(names, vec!["Alpha", "Beta", "Delta", "Epsilon", "Gamma"]);
    }

    #[test]
    fn test_query_page_filter_and_sort() {
        let store = FeatureStore::from_features(make_features());
        let filter_json = json!(["==", ["get", "type"], "airport"]);
        let filter = libexpression::parse(filter_json).expect("parse failed");
        let result = store.query_page(0, 10, Some(&filter), Some("score"), true);
        assert_eq!(result.total_matching, 3);
        let scores: Vec<f64> = result.features.iter()
            .map(|f| f["properties"]["score"].as_f64().unwrap())
            .collect();
        assert_eq!(scores, vec![5.0, 10.0, 30.0]);
    }

    #[test]
    fn test_query_page_complex_filter() {
        let store = FeatureStore::from_features(make_features());
        let filter_json = json!(["all",
            ["==", ["get", "type"], "airport"],
            [">=", ["get", "score"], 10]
        ]);
        let filter = libexpression::parse(filter_json).expect("parse failed");
        let result = store.query_page(0, 10, Some(&filter), None, true);
        assert_eq!(result.total_matching, 2);
    }

    #[test]
    fn test_schema_inferred() {
        let store = FeatureStore::from_features(make_features());
        let schema = store.schema();
        assert!(schema.columns.contains_key("name"));
        assert!(schema.columns.contains_key("score"));
        assert!(schema.columns.contains_key("type"));
        assert_eq!(schema.points_count, 5);
    }

    #[test]
    fn test_feature_bbox_from_geometry() {
        let feature = make_point_feature(10.5, 20.3, json!({}));
        let bbox = compute_feature_bbox(&feature).expect("bbox should be computed");
        assert_eq!(bbox, (10.5, 20.3, 10.5, 20.3));
    }

    #[test]
    fn test_feature_bbox_from_explicit_bbox() {
        let feature = Feature {
            bbox: Some(vec![1.0, 2.0, 3.0, 4.0]),
            geometry: Some(Geometry::new(GeoValue::Point(vec![0.0, 0.0]))),
            id: None,
            properties: None,
            foreign_members: None,
        };
        let bbox = compute_feature_bbox(&feature).expect("bbox should be from explicit");
        assert_eq!(bbox, (1.0, 2.0, 3.0, 4.0));
    }

    #[test]
    fn test_query_rect_include_point_inside() {
        let features = vec![
            Feature {
                bbox: None,
                geometry: Some(Geometry::new(GeoValue::Point(vec![1.0, 1.0]))),
                id: Some(geojson::feature::Id::Number(serde_json::Number::from(1))),
                properties: None,
                foreign_members: None,
            },
            Feature {
                bbox: None,
                geometry: Some(Geometry::new(GeoValue::Point(vec![5.0, 5.0]))),
                id: Some(geojson::feature::Id::Number(serde_json::Number::from(2))),
                properties: None,
                foreign_members: None,
            },
        ];
        let store = FeatureStore::from_features(features);
        let result = store.query_rect([0.0, 0.0, 2.0, 2.0], "include");
        assert_eq!(result, vec![1i64]);
    }

    #[test]
    fn test_query_rect_include_point_outside() {
        let features = vec![Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![5.0, 5.0]))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(1))),
            properties: None,
            foreign_members: None,
        }];
        let store = FeatureStore::from_features(features);
        let result = store.query_rect([0.0, 0.0, 2.0, 2.0], "include");
        assert!(result.is_empty());
    }

    #[test]
    fn test_query_rect_intersect_line_crossing() {
        // Line from (0.5, -1) to (0.5, 3) crosses the bbox (0,0,2,2)
        let features = vec![Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::LineString(vec![
                vec![0.5, -1.0],
                vec![0.5, 3.0],
            ]))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(1))),
            properties: None,
            foreign_members: None,
        }];
        let store = FeatureStore::from_features(features);
        // include: line extends outside bbox → not included
        assert!(store.query_rect([0.0, 0.0, 2.0, 2.0], "include").is_empty());
        // intersect: line crosses bbox → selected
        assert_eq!(store.query_rect([0.0, 0.0, 2.0, 2.0], "intersect"), vec![1i64]);
    }

    #[test]
    fn test_query_rect_empty_store() {
        let store = FeatureStore::from_features(vec![]);
        assert!(store.query_rect([0.0, 0.0, 10.0, 10.0], "include").is_empty());
        assert!(store.query_rect([0.0, 0.0, 10.0, 10.0], "intersect").is_empty());
    }

    #[test]
    fn test_query_rect_feature_without_id_excluded() {
        let features = vec![Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![1.0, 1.0]))),
            id: None, // no id
            properties: None,
            foreign_members: None,
        }];
        let store = FeatureStore::from_features(features);
        // Feature has no id — cannot be selected
        assert!(store.query_rect([0.0, 0.0, 2.0, 2.0], "include").is_empty());
    }

    fn ring_from(points: &[Point2]) -> Vec<Vec<f64>> {
        points.iter().map(|&(x, y)| vec![x, y]).collect()
    }

    fn polygon_feature(id: i64, ring: &[Point2]) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Polygon(vec![ring_from(ring)]))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(id))),
            properties: None,
            foreign_members: None,
        }
    }

    fn multi_polygon_feature(id: i64, polygons: &[&[Point2]]) -> Feature {
        let parts = polygons.iter().map(|p| vec![ring_from(p)]).collect();
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::MultiPolygon(parts))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(id))),
            properties: None,
            foreign_members: None,
        }
    }

    fn square(x0: f64, y0: f64, x1: f64, y1: f64) -> [Point2; 5] {
        [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
    }

    fn square_feature(id: i64, x0: f64, y0: f64, x1: f64, y1: f64) -> Feature {
        polygon_feature(id, &square(x0, y0, x1, y1))
    }

    fn point_feature(id: i64, x: f64, y: f64) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![x, y]))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(id))),
            properties: None,
            foreign_members: None,
        }
    }

    #[test]
    fn test_query_rect_include_polygon_fully_inside() {
        let features = vec![square_feature(1, 1.0, 1.0, 2.0, 2.0)];
        let store = FeatureStore::from_features(features);
        assert_eq!(store.query_rect([0.0, 0.0, 3.0, 3.0], "include"), vec![1i64]);
    }

    #[test]
    fn test_query_rect_include_polygon_straddling_edge_excluded() {
        // Polygon straddles east edge of rect — bbox extends past rect, not included.
        let features = vec![square_feature(1, 1.0, 1.0, 4.0, 2.0)];
        let store = FeatureStore::from_features(features);
        assert!(store.query_rect([0.0, 0.0, 3.0, 3.0], "include").is_empty());
    }

    #[test]
    fn test_query_rect_intersect_polygon_straddling_edge_included() {
        // Same polygon crossing east edge — geometry overlaps rect → intersect matches.
        let features = vec![square_feature(1, 1.0, 1.0, 4.0, 2.0)];
        let store = FeatureStore::from_features(features);
        assert_eq!(
            store.query_rect([0.0, 0.0, 3.0, 3.0], "intersect"),
            vec![1i64]
        );
    }

    #[test]
    fn test_query_rect_intersect_polygon_fully_outside() {
        let features = vec![square_feature(1, 10.0, 10.0, 11.0, 11.0)];
        let store = FeatureStore::from_features(features);
        assert!(store
            .query_rect([0.0, 0.0, 3.0, 3.0], "intersect")
            .is_empty());
    }

    #[test]
    fn test_query_rect_intersect_bbox_overlaps_but_geometry_does_not() {
        // Right triangle with vertices (0,0), (2,0), (0,2). Polygon bbox: (0,0,2,2).
        // Query rect: (1.5, 1.5, 3.0, 3.0). Bbox of triangle intersects query rect
        // (corner region 1.5..2, 1.5..2), but the triangle's geometry at x=1.5 only
        // reaches y=0.5, so the actual polygon does not enter the query rect.
        let features = vec![polygon_feature(
            1,
            &[(0.0, 0.0), (2.0, 0.0), (0.0, 2.0), (0.0, 0.0)],
        )];
        let store = FeatureStore::from_features(features);
        // bbox-based candidate filter passes (R-tree bbox overlap), but geometric
        // intersect correctly returns empty.
        assert!(store
            .query_rect([1.5, 1.5, 3.0, 3.0], "intersect")
            .is_empty());
    }

    #[test]
    fn test_query_rect_intersect_multipolygon() {
        // MultiPolygon with two parts: one inside rect, one outside.
        let features = vec![multi_polygon_feature(
            7,
            &[&square(0.5, 0.5, 1.5, 1.5), &square(10.0, 10.0, 11.0, 11.0)],
        )];
        let store = FeatureStore::from_features(features);
        assert_eq!(
            store.query_rect([0.0, 0.0, 2.0, 2.0], "intersect"),
            vec![7i64]
        );
    }

    #[test]
    fn test_query_rect_self_intersecting_polygon_is_skipped_not_panicking() {
        // Bowtie polygon: self-intersecting ring. geo's relate algorithm may panic
        // on such invalid geometries — the panic guard must swallow it and return
        // without crashing, leaving the feature out of the result.
        let features = vec![
            polygon_feature(
                1,
                &[(0.0, 0.0), (2.0, 2.0), (2.0, 0.0), (0.0, 2.0), (0.0, 0.0)],
            ),
            square_feature(2, 0.5, 0.5, 1.5, 1.5),
        ];
        let store = FeatureStore::from_features(features);
        // Must not panic. Valid feature (2) still returned.
        let result = store.query_rect([0.0, 0.0, 3.0, 3.0], "intersect");
        assert!(result.contains(&2));
    }

    #[test]
    fn test_query_rect_result_is_sorted() {
        let features = vec![
            square_feature(5, 0.1, 0.1, 0.2, 0.2),
            square_feature(2, 0.3, 0.3, 0.4, 0.4),
            square_feature(8, 0.5, 0.5, 0.6, 0.6),
            square_feature(1, 0.7, 0.7, 0.8, 0.8),
        ];
        let store = FeatureStore::from_features(features);
        let result = store.query_rect([0.0, 0.0, 1.0, 1.0], "include");
        assert_eq!(result, vec![1i64, 2, 5, 8]);
    }

    #[test]
    fn test_query_rect_mixed_features_include() {
        let features = vec![
            square_feature(1, 0.1, 0.1, 0.5, 0.5),      // inside
            square_feature(2, 0.8, 0.8, 5.0, 5.0),      // straddles east edge
            square_feature(3, 10.0, 10.0, 11.0, 11.0),  // outside
            point_feature(4, 0.5, 0.5),                 // inside
        ];
        let store = FeatureStore::from_features(features);
        let result = store.query_rect([0.0, 0.0, 1.0, 1.0], "include");
        assert_eq!(result, vec![1i64, 4]);
    }

    #[test]
    fn test_query_rect_unknown_mode_returns_empty() {
        let features = vec![square_feature(1, 0.1, 0.1, 0.5, 0.5)];
        let store = FeatureStore::from_features(features);
        assert!(store
            .query_rect([0.0, 0.0, 1.0, 1.0], "bogus")
            .is_empty());
    }

    #[test]
    fn test_query_rect_include_uses_explicit_feature_bbox() {
        // Explicit feature.bbox wider than the geometry would suggest: inclusion
        // must reflect the declared bbox, not the raw geometry.
        let feature = Feature {
            bbox: Some(vec![0.5, 0.5, 10.0, 10.0]),
            geometry: Some(Geometry::new(GeoValue::Point(vec![1.0, 1.0]))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(1))),
            properties: None,
            foreign_members: None,
        };
        let store = FeatureStore::from_features(vec![feature]);
        // Query rect doesn't contain the declared bbox → excluded.
        assert!(store
            .query_rect([0.0, 0.0, 5.0, 5.0], "include")
            .is_empty());
        // Query rect contains the declared bbox → included.
        assert_eq!(
            store.query_rect([0.0, 0.0, 20.0, 20.0], "include"),
            vec![1i64]
        );
    }

    fn make_id_point(id: i64, lon: f64, lat: f64) -> Feature {
        let mut f = make_point_feature(lon, lat, json!({"name": format!("f{id}")}));
        f.id = Some(geojson::feature::Id::Number(id.into()));
        f
    }

    fn make_id_store() -> FeatureStore {
        FeatureStore::from_features(vec![
            make_id_point(1, 0.0, 0.0),
            make_id_point(2, 1.0, 1.0),
            make_id_point(3, 2.0, 2.0),
        ])
    }

    const WORLD: [f64; 4] = [-180.0, -90.0, 180.0, 90.0];

    #[test]
    fn test_upsert_new_feature_is_queryable_and_grows_bounds() {
        let mut store = make_id_store();
        let prev = store.upsert(make_id_point(4, 10.0, 10.0));
        assert!(prev.is_none());
        assert_eq!(store.feature_count(), 4);
        assert_eq!(store.query_rect([9.0, 9.0, 11.0, 11.0], "include"), vec![4]);
        assert_eq!(store.get_bounds(), Some((0.0, 0.0, 10.0, 10.0)));
    }

    #[test]
    fn test_upsert_existing_replaces_and_returns_previous() {
        let mut store = make_id_store();
        let prev = store.upsert(make_id_point(2, 20.0, 20.0)).expect("previous");
        assert_eq!(prev.geometry.unwrap().value, GeoValue::Point(vec![1.0, 1.0]));
        assert_eq!(store.feature_count(), 3);
        assert!(store.query_rect([0.5, 0.5, 1.5, 1.5], "include").is_empty());
        assert_eq!(store.query_rect([19.0, 19.0, 21.0, 21.0], "intersect"), vec![2]);
    }

    #[test]
    fn test_upsert_existing_is_reflected_in_features_and_page() {
        let mut store = make_id_store();
        store.upsert(make_id_point(2, 20.0, 20.0));
        let geoms: Vec<GeoValue> = store
            .features()
            .filter(|f| feature_id_i64(f) == Some(2))
            .filter_map(|f| f.geometry.as_ref().map(|g| g.value.clone()))
            .collect();
        assert_eq!(geoms, vec![GeoValue::Point(vec![20.0, 20.0])]);
        let page = store.query_page(0, 10, None, None, true);
        assert_eq!(page.total_matching, 3);
        let coords: Vec<&Value> = page
            .features
            .iter()
            .filter(|f| f["id"] == json!(2))
            .map(|f| &f["geometry"]["coordinates"])
            .collect();
        assert_eq!(coords, vec![&json!([20.0, 20.0])]);
    }

    #[test]
    fn test_remove_makes_feature_unfindable() {
        let mut store = make_id_store();
        let removed = store.remove(2).expect("removed");
        assert_eq!(removed.geometry.unwrap().value, GeoValue::Point(vec![1.0, 1.0]));
        assert_eq!(store.feature_count(), 2);
        assert_eq!(store.query_rect(WORLD, "include"), vec![1, 3]);
        assert_eq!(store.query_rect(WORLD, "intersect"), vec![1, 3]);
        assert_eq!(store.features().count(), 2);
        assert_eq!(store.query_page(0, 10, None, None, true).total_matching, 2);
        assert_eq!(store.get_filtered(None).len(), 2);
    }

    #[test]
    fn test_remove_missing_returns_none() {
        let mut store = make_id_store();
        assert!(store.remove(99).is_none());
        assert_eq!(store.feature_count(), 3);
    }

    #[test]
    fn test_remove_keeps_other_indices_valid() {
        let mut store = make_id_store();
        store.remove(1);
        assert_eq!(store.query_rect([1.5, 1.5, 2.5, 2.5], "include"), vec![3]);
        let got = store.get_by_ids(&[3, 2]);
        let ids: Vec<Option<i64>> = got.iter().map(feature_id_i64).collect();
        assert_eq!(ids, vec![Some(3), Some(2)]);
        // appending a new feature after a tombstone does not disturb others
        store.upsert(make_id_point(5, 7.0, 7.0));
        assert_eq!(store.query_rect(WORLD, "include"), vec![2, 3, 5]);
    }

    #[test]
    fn test_remove_recomputes_bounds() {
        let mut store = make_id_store();
        store.remove(3);
        assert_eq!(store.get_bounds(), Some((0.0, 0.0, 1.0, 1.0)));
        store.remove(1);
        store.remove(2);
        assert!(store.get_bounds().is_none());
    }

    #[test]
    fn test_remove_interior_keeps_bounds() {
        let mut store = make_id_store();
        store.remove(2);
        assert_eq!(store.get_bounds(), Some((0.0, 0.0, 2.0, 2.0)));
    }

    #[test]
    fn test_get_by_ids_skips_missing_and_removed() {
        let mut store = make_id_store();
        store.remove(2);
        let got = store.get_by_ids(&[1, 2, 99, 3]);
        let ids: Vec<Option<i64>> = got.iter().map(feature_id_i64).collect();
        assert_eq!(ids, vec![Some(1), Some(3)]);
    }

    #[test]
    fn test_upsert_after_remove_same_id() {
        let mut store = make_id_store();
        store.remove(2);
        assert!(store.upsert(make_id_point(2, 8.0, 8.0)).is_none());
        assert_eq!(store.feature_count(), 3);
        assert_eq!(store.query_rect([7.0, 7.0, 9.0, 9.0], "include"), vec![2]);
    }

    #[test]
    fn test_max_id_tracks_live_ids() {
        let mut store = make_id_store();
        assert_eq!(store.max_id(), Some(3));
        store.remove(3);
        assert_eq!(store.max_id(), Some(2));
        assert_eq!(FeatureStore::from_features(vec![]).max_id(), None);
    }

    #[test]
    fn test_has_duplicate_ids_is_false_for_unique_ids() {
        let mut store = make_id_store();
        assert!(!store.has_duplicate_ids());
        store.upsert(make_id_point(2, 9.0, 9.0));
        store.remove(1);
        assert!(!store.has_duplicate_ids());
        assert!(!FeatureStore::from_features(vec![]).has_duplicate_ids());
    }

    #[test]
    fn test_has_duplicate_ids_ignores_features_without_an_id() {
        let store = FeatureStore::from_features(vec![
            make_point_feature(0.0, 0.0, json!({})),
            make_point_feature(1.0, 1.0, json!({})),
            make_id_point(1, 2.0, 2.0),
        ]);
        assert!(!store.has_duplicate_ids());
    }

    #[test]
    fn test_has_duplicate_ids_is_true_when_two_features_share_an_id() {
        let store = FeatureStore::from_features(vec![
            make_id_point(1, 0.0, 0.0),
            make_id_point(1, 1.0, 1.0),
            make_id_point(2, 2.0, 2.0),
        ]);
        assert!(store.has_duplicate_ids());
    }

    /// `count` points along the diagonal, ids 1..=count.
    fn diagonal_store(count: i64) -> FeatureStore {
        FeatureStore::from_features((1..=count).map(|i| point_feature(i, i as f64, i as f64)).collect())
    }

    #[test]
    fn test_query_rect_limited_matches_query_rect_under_the_limit() {
        let features = vec![
            square_feature(1, 0.1, 0.1, 0.5, 0.5),
            square_feature(2, 0.8, 0.8, 5.0, 5.0),
            square_feature(3, 10.0, 10.0, 11.0, 11.0),
            point_feature(4, 0.5, 0.5),
            polygon_feature(5, &[(0.0, 0.0), (2.0, 0.0), (0.0, 2.0), (0.0, 0.0)]),
        ];
        let store = FeatureStore::from_features(features);
        for rect in [[0.0, 0.0, 1.0, 1.0], [1.5, 1.5, 3.0, 3.0], WORLD] {
            for mode in ["include", "intersect", "bogus"] {
                let (ids, over) = store.query_rect_limited(rect, mode, 10);
                assert_eq!(ids, store.query_rect(rect, mode), "{rect:?} {mode}");
                assert!(!over, "{rect:?} {mode}");
            }
        }
    }

    #[test]
    fn test_query_rect_limited_at_the_limit_is_not_over() {
        let store = diagonal_store(3);
        let (ids, over) = store.query_rect_limited(WORLD, "intersect", 3);
        assert_eq!(ids, vec![1, 2, 3]);
        assert!(!over);
    }

    #[test]
    fn test_query_rect_limited_stops_past_the_limit() {
        let store = diagonal_store(50);
        for mode in ["include", "intersect"] {
            let (ids, over) = store.query_rect_limited(WORLD, mode, 5);
            assert!(over, "{mode}");
            assert_eq!(ids.len(), 5, "{mode}: at most `limit` ids come back");
            assert!(ids.windows(2).all(|w| w[0] < w[1]), "{mode}: sorted");
        }
    }

    #[test]
    fn test_query_rect_limited_zero_limit() {
        let store = diagonal_store(2);
        assert_eq!(store.query_rect_limited(WORLD, "intersect", 0), (vec![], true));
        assert_eq!(store.query_rect_limited([100.0, 0.0, 101.0, 1.0], "intersect", 0), (vec![], false));
    }

    #[test]
    fn test_query_rect_limited_skips_removed_and_geometry_less_features() {
        let mut store = diagonal_store(3);
        store.remove(2);
        let no_geometry = Feature {
            bbox: Some(vec![0.5, 0.5, 0.6, 0.6]),
            geometry: None,
            id: Some(geojson::feature::Id::Number(9.into())),
            properties: None,
            foreign_members: None,
        };
        store.upsert(no_geometry);
        assert_eq!(store.query_rect_limited(WORLD, "intersect", 10), (vec![1, 3], false));
    }
}
