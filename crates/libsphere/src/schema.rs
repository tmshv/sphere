use geojson::feature::Id;
use geojson::{Feature, FeatureCollection};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub enum ColumnType {
    Str,
    Num,
    Mixed,
}

impl ColumnType {
    fn as_str(&self) -> &'static str {
        match self {
            ColumnType::Str => "String",
            ColumnType::Num => "Number",
            ColumnType::Mixed => "Mixed",
        }
    }
}

fn value_type(val: &Value) -> ColumnType {
    match val {
        Value::String(_) => ColumnType::Str,
        Value::Number(_) => ColumnType::Num,
        _ => ColumnType::Mixed,
    }
}

pub fn merge_type(existing: ColumnType, val: &Value) -> ColumnType {
    if existing == ColumnType::Mixed {
        return ColumnType::Mixed;
    }
    let new_type = value_type(val);
    if existing == new_type {
        existing
    } else {
        ColumnType::Mixed
    }
}

#[derive(Debug, Serialize)]
pub struct SourceSchema {
    pub columns: HashMap<String, String>,
    pub points_count: u32,
    pub lines_count: u32,
    pub polygons_count: u32,
}

pub fn infer_source_schema<'a>(features: impl Iterator<Item = &'a Feature>) -> SourceSchema {
    let mut col_map: HashMap<String, ColumnType> = HashMap::new();
    let mut points_count: u32 = 0;
    let mut lines_count: u32 = 0;
    let mut polygons_count: u32 = 0;
    for feature in features {
        if matches!(&feature.id, Some(Id::String(_))) {
            col_map.entry("$id".to_string()).or_insert(ColumnType::Str);
        }
        if let Some(props) = &feature.properties {
            for (key, val) in props {
                if val.is_null() {
                    continue;
                }
                col_map
                    .entry(key.clone())
                    .and_modify(|existing| {
                        *existing = merge_type(existing.clone(), val);
                    })
                    .or_insert_with(|| value_type(val));
            }
        }
        if let Some(geometry) = &feature.geometry {
            match &geometry.value {
                geojson::Value::Point(_) | geojson::Value::MultiPoint(_) => points_count += 1,
                geojson::Value::LineString(_) | geojson::Value::MultiLineString(_) => {
                    lines_count += 1
                }
                geojson::Value::Polygon(_) | geojson::Value::MultiPolygon(_) => {
                    polygons_count += 1
                }
                _ => {}
            }
        }
    }
    let columns = col_map
        .into_iter()
        .map(|(k, v)| (k, v.as_str().to_string()))
        .collect();
    SourceSchema {
        columns,
        points_count,
        lines_count,
        polygons_count,
    }
}


pub fn assign_feature_ids(fc: &mut FeatureCollection) {
    let max_existing = fc
        .features
        .iter()
        .filter_map(|f| match &f.id {
            Some(Id::Number(n)) => n.as_u64(),
            _ => None,
        })
        .max()
        .unwrap_or(0);
    let mut counter: u64 = max_existing + 1;
    for feature in &mut fc.features {
        if matches!(&feature.id, Some(Id::Number(_))) {
            continue;
        }
        if let Some(Id::String(s)) = &feature.id {
            let original = Value::String(s.clone());
            feature
                .properties
                .get_or_insert_with(Default::default)
                .insert("$id".to_string(), original);
        }
        feature.id = Some(Id::Number(counter.into()));
        counter += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use geojson::feature::Id;
    use geojson::{Feature, FeatureCollection, Geometry, Value as GeoValue};
    use serde_json::json;

    fn make_feature(props: serde_json::Value) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![0.0, 0.0]))),
            id: None,
            properties: props.as_object().cloned(),
            foreign_members: None,
        }
    }

    #[test]
    fn test_merge_type_str_stays_str() {
        let result = merge_type(ColumnType::Str, &json!("hello"));
        assert_eq!(result, ColumnType::Str);
    }

    #[test]
    fn test_merge_type_num_stays_num() {
        let result = merge_type(ColumnType::Num, &json!(42));
        assert_eq!(result, ColumnType::Num);
    }

    #[test]
    fn test_merge_type_str_then_num_is_mixed() {
        let result = merge_type(ColumnType::Str, &json!(42));
        assert_eq!(result, ColumnType::Mixed);
    }

    #[test]
    fn test_merge_type_num_then_str_is_mixed() {
        let result = merge_type(ColumnType::Num, &json!("hello"));
        assert_eq!(result, ColumnType::Mixed);
    }

    #[test]
    fn test_merge_type_mixed_stays_mixed() {
        let result = merge_type(ColumnType::Mixed, &json!("hello"));
        assert_eq!(result, ColumnType::Mixed);
    }

    #[test]
    fn test_infer_schema_homogeneous() {
        let f1 = make_feature(json!({"name": "Alice", "score": 10}));
        let f2 = make_feature(json!({"name": "Bob", "score": 20}));
        let features = vec![f1, f2];
        let schema = infer_source_schema(features.iter()).columns;
        assert_eq!(schema.get("name"), Some(&"String".to_string()));
        assert_eq!(schema.get("score"), Some(&"Number".to_string()));
    }

    #[test]
    fn test_infer_schema_heterogeneous_produces_mixed() {
        let f1 = make_feature(json!({"name": "Alice", "score": 10}));
        let f2 = make_feature(json!({"name": 99, "score": 20}));
        let features = vec![f1, f2];
        let schema = infer_source_schema(features.iter()).columns;
        assert_eq!(schema.get("name"), Some(&"Mixed".to_string()));
        assert_eq!(schema.get("score"), Some(&"Number".to_string()));
    }

    #[test]
    fn test_infer_schema_empty_returns_empty_map() {
        let features: Vec<Feature> = vec![];
        let schema = infer_source_schema(features.iter()).columns;
        assert!(schema.is_empty());
    }

    fn make_feature_with_geometry(geom: GeoValue, props: serde_json::Value) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(geom)),
            id: None,
            properties: props.as_object().cloned(),
            foreign_members: None,
        }
    }

    #[test]
    fn test_infer_source_schema_counts_geometry_types() {
        use super::infer_source_schema;
        let f1 = make_feature_with_geometry(GeoValue::Point(vec![0.0, 0.0]), json!({"a": 1}));
        let f2 = make_feature_with_geometry(GeoValue::Point(vec![1.0, 1.0]), json!({"a": 2}));
        let f3 = make_feature_with_geometry(
            GeoValue::LineString(vec![vec![0.0, 0.0], vec![1.0, 1.0]]),
            json!({"b": "x"}),
        );
        let f4 = make_feature_with_geometry(
            GeoValue::Polygon(vec![vec![
                vec![0.0, 0.0],
                vec![1.0, 0.0],
                vec![1.0, 1.0],
                vec![0.0, 0.0],
            ]]),
            json!({}),
        );
        let features = vec![f1, f2, f3, f4];
        let schema = infer_source_schema(features.iter());
        assert_eq!(schema.points_count, 2);
        assert_eq!(schema.lines_count, 1);
        assert_eq!(schema.polygons_count, 1);
        assert_eq!(schema.columns.get("a"), Some(&"Number".to_string()));
        assert_eq!(schema.columns.get("b"), Some(&"String".to_string()));
    }

    fn make_feature_with_id(id: Option<Id>, props: serde_json::Value) -> Feature {
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![0.0, 0.0]))),
            id,
            properties: props.as_object().cloned(),
            foreign_members: None,
        }
    }

    #[test]
    fn test_assign_feature_ids_string_id_gets_numeric_and_original_preserved() {
        let mut fc = FeatureCollection {
            bbox: None,
            features: vec![make_feature_with_id(
                Some(Id::String("abc".into())),
                json!({}),
            )],
            foreign_members: None,
        };
        assign_feature_ids(&mut fc);
        let f = &fc.features[0];
        assert_eq!(f.id, Some(Id::Number(1u64.into())));
        let props = f.properties.as_ref().unwrap();
        assert_eq!(props.get("$id"), Some(&json!("abc")));
    }

    #[test]
    fn test_infer_schema_string_id_adds_dollar_id_column() {
        let f = make_feature_with_id(Some(Id::String("abc".into())), json!({"name": "Alice"}));
        let features = vec![f];
        let schema = infer_source_schema(features.iter()).columns;
        assert_eq!(schema.get("$id"), Some(&"String".to_string()));
        assert_eq!(schema.get("name"), Some(&"String".to_string()));
    }

    #[test]
    fn test_infer_schema_numeric_id_no_dollar_id_column() {
        let f = make_feature_with_id(Some(Id::Number(1u64.into())), json!({"name": "Alice"}));
        let features = vec![f];
        let schema = infer_source_schema(features.iter()).columns;
        assert!(!schema.contains_key("$id"));
    }

    #[test]
    fn test_assign_feature_ids_string_id_overwrites_existing_dollar_id() {
        let mut fc = FeatureCollection {
            bbox: None,
            features: vec![make_feature_with_id(
                Some(Id::String("abc".into())),
                json!({ "$id": "existing" }),
            )],
            foreign_members: None,
        };
        assign_feature_ids(&mut fc);
        let f = &fc.features[0];
        assert_eq!(f.id, Some(Id::Number(1u64.into())));
        let props = f.properties.as_ref().unwrap();
        // The feature's string id "abc" must overwrite the existing "$id"
        assert_eq!(props.get("$id"), Some(&json!("abc")));
    }

    #[test]
    fn test_assign_feature_ids_none_id_gets_numeric_no_dollar_id() {
        let mut fc = FeatureCollection {
            bbox: None,
            features: vec![make_feature_with_id(None, json!({}))],
            foreign_members: None,
        };
        assign_feature_ids(&mut fc);
        let f = &fc.features[0];
        assert_eq!(f.id, Some(Id::Number(1u64.into())));
        let props = f.properties.as_ref().unwrap();
        assert!(!props.contains_key("$id"));
    }

    #[test]
    fn test_assign_feature_ids_existing_numeric_id_unchanged() {
        let mut fc = FeatureCollection {
            bbox: None,
            features: vec![make_feature_with_id(
                Some(Id::Number(42u64.into())),
                json!({}),
            )],
            foreign_members: None,
        };
        assign_feature_ids(&mut fc);
        let f = &fc.features[0];
        assert_eq!(f.id, Some(Id::Number(42u64.into())));
        let props = f.properties.as_ref().unwrap();
        assert!(!props.contains_key("$id"));
    }
}
