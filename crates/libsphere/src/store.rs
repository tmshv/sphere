use geo::Intersects;
use geojson::Feature;
use std::panic::{catch_unwind, AssertUnwindSafe};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;

use libexpression::{EvalContext, Expr, Value as ExprValue};

use crate::index::{Bbox, RstarIndex, SpatialIndex};
use crate::schema::{infer_source_schema, SourceSchema};

#[derive(Debug, Serialize)]
pub struct PageResult {
    pub features: Vec<Value>,
    pub total_matching: u64,
    pub offset: u64,
    pub limit: u64,
}

pub struct FeatureStore {
    features: Vec<Feature>,
    feature_ids: Vec<Option<i64>>,
    feature_bboxes: Vec<Option<Bbox>>,
    index: Box<dyn SpatialIndex>,
    schema: SourceSchema,
    bounds: Option<Bbox>,
}

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

        Self {
            features,
            feature_ids,
            feature_bboxes,
            index,
            schema,
            bounds: overall_bbox,
        }
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
                let feature = &self.features[idx];
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
                let val_a = get_property_value(&self.features[a], col);
                let val_b = get_property_value(&self.features[b], col);
                let ord = compare_values(val_a, val_b);
                if sort_asc { ord } else { ord.reverse() }
            });
        }

        let total_matching = matching_indices.len() as u64;

        let page: Vec<Value> = matching_indices
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .filter_map(|idx| serde_json::to_value(&self.features[idx]).ok())
            .collect();

        PageResult {
            features: page,
            total_matching,
            offset,
            limit,
        }
    }

    pub fn features(&self) -> &[Feature] {
        &self.features
    }

    /// Returns all features that match the given filter expression as JSON values.
    /// When `filter` is None, all features are returned.
    pub fn get_filtered(&self, filter: Option<&Expr>) -> Vec<Value> {
        let result = self.query_page(0, u64::MAX, filter, None, true);
        result.features
    }

    pub fn feature_count(&self) -> u64 {
        self.features.len() as u64
    }

    pub fn get_bounds(&self) -> Option<Bbox> {
        self.bounds
    }

    pub fn schema(&self) -> &SourceSchema {
        &self.schema
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
                    let geometry = match &self.features[idx].geometry {
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
    let mut west = f64::INFINITY;
    let mut south = f64::INFINITY;
    let mut east = f64::NEG_INFINITY;
    let mut north = f64::NEG_INFINITY;

    if collect_coords(value, &mut west, &mut south, &mut east, &mut north) {
        Some((west, south, east, north))
    } else {
        None
    }
}

fn collect_coords(
    value: &geojson::Value,
    west: &mut f64,
    south: &mut f64,
    east: &mut f64,
    north: &mut f64,
) -> bool {
    match value {
        geojson::Value::Point(pt) => {
            if pt.len() >= 2 {
                update_bounds(pt[0], pt[1], west, south, east, north);
                true
            } else {
                false
            }
        }
        geojson::Value::MultiPoint(pts) => {
            let mut any = false;
            for pt in pts {
                if pt.len() >= 2 {
                    update_bounds(pt[0], pt[1], west, south, east, north);
                    any = true;
                }
            }
            any
        }
        geojson::Value::LineString(pts) => {
            let mut any = false;
            for pt in pts {
                if pt.len() >= 2 {
                    update_bounds(pt[0], pt[1], west, south, east, north);
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
                        update_bounds(pt[0], pt[1], west, south, east, north);
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
                        update_bounds(pt[0], pt[1], west, south, east, north);
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
                            update_bounds(pt[0], pt[1], west, south, east, north);
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
                if collect_coords(&geom.value, west, south, east, north) {
                    any = true;
                }
            }
            any
        }
    }
}

fn update_bounds(lon: f64, lat: f64, west: &mut f64, south: &mut f64, east: &mut f64, north: &mut f64) {
    if lon < *west { *west = lon; }
    if lat < *south { *south = lat; }
    if lon > *east { *east = lon; }
    if lat > *north { *north = lat; }
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

    fn make_polygon_feature(id: i64, rings: Vec<Vec<Vec<f64>>>) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Polygon(rings))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(id))),
            properties: None,
            foreign_members: None,
        }
    }

    fn square_ring(x0: f64, y0: f64, x1: f64, y1: f64) -> Vec<Vec<f64>> {
        vec![
            vec![x0, y0],
            vec![x1, y0],
            vec![x1, y1],
            vec![x0, y1],
            vec![x0, y0],
        ]
    }

    #[test]
    fn test_query_rect_include_polygon_fully_inside() {
        let features = vec![make_polygon_feature(1, vec![square_ring(1.0, 1.0, 2.0, 2.0)])];
        let store = FeatureStore::from_features(features);
        assert_eq!(store.query_rect([0.0, 0.0, 3.0, 3.0], "include"), vec![1i64]);
    }

    #[test]
    fn test_query_rect_include_polygon_straddling_edge_excluded() {
        // Polygon straddles east edge of rect — bbox extends past rect, not included.
        let features = vec![make_polygon_feature(1, vec![square_ring(1.0, 1.0, 4.0, 2.0)])];
        let store = FeatureStore::from_features(features);
        assert!(store.query_rect([0.0, 0.0, 3.0, 3.0], "include").is_empty());
    }

    #[test]
    fn test_query_rect_intersect_polygon_straddling_edge_included() {
        // Same polygon crossing east edge — geometry overlaps rect → intersect matches.
        let features = vec![make_polygon_feature(1, vec![square_ring(1.0, 1.0, 4.0, 2.0)])];
        let store = FeatureStore::from_features(features);
        assert_eq!(
            store.query_rect([0.0, 0.0, 3.0, 3.0], "intersect"),
            vec![1i64]
        );
    }

    #[test]
    fn test_query_rect_intersect_polygon_fully_outside() {
        let features = vec![make_polygon_feature(1, vec![square_ring(10.0, 10.0, 11.0, 11.0)])];
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
        let triangle = vec![vec![
            vec![0.0, 0.0],
            vec![2.0, 0.0],
            vec![0.0, 2.0],
            vec![0.0, 0.0],
        ]];
        let features = vec![make_polygon_feature(1, triangle)];
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
        let feature = Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::MultiPolygon(vec![
                vec![square_ring(0.5, 0.5, 1.5, 1.5)],
                vec![square_ring(10.0, 10.0, 11.0, 11.0)],
            ]))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(7))),
            properties: None,
            foreign_members: None,
        };
        let store = FeatureStore::from_features(vec![feature]);
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
        let bowtie = vec![vec![
            vec![0.0, 0.0],
            vec![2.0, 2.0],
            vec![2.0, 0.0],
            vec![0.0, 2.0],
            vec![0.0, 0.0],
        ]];
        let features = vec![
            make_polygon_feature(1, bowtie),
            make_polygon_feature(2, vec![square_ring(0.5, 0.5, 1.5, 1.5)]),
        ];
        let store = FeatureStore::from_features(features);
        // Must not panic. Valid feature (2) still returned.
        let result = store.query_rect([0.0, 0.0, 3.0, 3.0], "intersect");
        assert!(result.contains(&2));
    }

    #[test]
    fn test_query_rect_result_is_sorted() {
        let features = vec![
            make_polygon_feature(5, vec![square_ring(0.1, 0.1, 0.2, 0.2)]),
            make_polygon_feature(2, vec![square_ring(0.3, 0.3, 0.4, 0.4)]),
            make_polygon_feature(8, vec![square_ring(0.5, 0.5, 0.6, 0.6)]),
            make_polygon_feature(1, vec![square_ring(0.7, 0.7, 0.8, 0.8)]),
        ];
        let store = FeatureStore::from_features(features);
        let result = store.query_rect([0.0, 0.0, 1.0, 1.0], "include");
        assert_eq!(result, vec![1i64, 2, 5, 8]);
    }

    #[test]
    fn test_query_rect_mixed_features_include() {
        let features = vec![
            make_polygon_feature(1, vec![square_ring(0.1, 0.1, 0.5, 0.5)]), // inside
            make_polygon_feature(2, vec![square_ring(0.8, 0.8, 5.0, 5.0)]), // straddles east edge
            make_polygon_feature(3, vec![square_ring(10.0, 10.0, 11.0, 11.0)]), // outside
            Feature {
                bbox: None,
                geometry: Some(Geometry::new(GeoValue::Point(vec![0.5, 0.5]))), // inside
                id: Some(geojson::feature::Id::Number(serde_json::Number::from(4))),
                properties: None,
                foreign_members: None,
            },
        ];
        let store = FeatureStore::from_features(features);
        let result = store.query_rect([0.0, 0.0, 1.0, 1.0], "include");
        assert_eq!(result, vec![1i64, 4]);
    }

    #[test]
    fn test_query_rect_unknown_mode_returns_empty() {
        let features = vec![make_polygon_feature(1, vec![square_ring(0.1, 0.1, 0.5, 0.5)])];
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
}
