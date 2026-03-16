use geojson::Feature;
use serde::Serialize;
use serde_json::{Map, Value};

use libexpression::{EvalContext, Expr};

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
    #[allow(dead_code)] // reserved for future bbox spatial queries
    index: Box<dyn SpatialIndex>,
    schema: SourceSchema,
    bounds: Option<Bbox>,
}

impl FeatureStore {
    pub fn from_features(features: Vec<Feature>) -> Self {
        let schema = infer_source_schema(features.iter());

        let mut entries = Vec::with_capacity(features.len());
        let mut overall_bbox: Option<Bbox> = None;

        for (idx, feature) in features.iter().enumerate() {
            if let Some(bbox) = compute_feature_bbox(feature) {
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
        let empty_map = Map::new();

        let mut matching_indices: Vec<usize> = (0..self.features.len())
            .filter(|&idx| {
                let feature = &self.features[idx];
                match filter {
                    None => true,
                    Some(expr) => {
                        let props = feature.properties.as_ref().unwrap_or(&empty_map);
                        let feature_id = feature_id_value(feature);
                        let feature_type = geometry_type_str(feature);
                        let ctx = EvalContext {
                            feature_id,
                            feature_type,
                            properties: props,
                        };
                        match expr.evaluate(&ctx) {
                            Ok(Value::Bool(b)) => b,
                            Ok(Value::Null) => false,
                            Ok(Value::Number(n)) => n.as_f64().map(|f| f != 0.0).unwrap_or(false),
                            Ok(_) => true,
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

    pub fn feature_count(&self) -> u64 {
        self.features.len() as u64
    }

    pub fn get_bounds(&self) -> Option<Bbox> {
        self.bounds
    }

    pub fn schema(&self) -> &SourceSchema {
        &self.schema
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

fn feature_id_value(feature: &Feature) -> Option<Value> {
    match &feature.id {
        Some(geojson::feature::Id::Number(n)) => Some(Value::Number(n.clone())),
        Some(geojson::feature::Id::String(s)) => Some(Value::String(s.clone())),
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
}
