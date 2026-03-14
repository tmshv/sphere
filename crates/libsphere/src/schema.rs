use geojson::feature::Id;
use geojson::{Feature, FeatureCollection};
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

pub fn infer_schema<'a>(features: impl Iterator<Item = &'a Feature>) -> HashMap<String, String> {
    let mut map: HashMap<String, ColumnType> = HashMap::new();
    for feature in features {
        if let Some(props) = &feature.properties {
            for (key, val) in props {
                map.entry(key.clone())
                    .and_modify(|existing| {
                        *existing = merge_type(existing.clone(), val);
                    })
                    .or_insert_with(|| value_type(val));
            }
        }
    }
    map.into_iter()
        .map(|(k, v)| (k, v.as_str().to_string()))
        .collect()
}

pub fn assign_feature_ids(fc: &mut FeatureCollection) {
    let mut counter: u64 = 1;
    for feature in &mut fc.features {
        if matches!(&feature.id, Some(Id::Number(_))) {
            continue;
        }
        let original = match &feature.id {
            Some(Id::String(s)) => Value::String(s.clone()),
            _ => Value::Null,
        };
        feature
            .properties
            .get_or_insert_with(Default::default)
            .entry("$id".to_string())
            .or_insert(original);
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
        let schema = infer_schema(features.iter());
        assert_eq!(schema.get("name"), Some(&"String".to_string()));
        assert_eq!(schema.get("score"), Some(&"Number".to_string()));
    }

    #[test]
    fn test_infer_schema_heterogeneous_produces_mixed() {
        let f1 = make_feature(json!({"name": "Alice", "score": 10}));
        let f2 = make_feature(json!({"name": 99, "score": 20}));
        let features = vec![f1, f2];
        let schema = infer_schema(features.iter());
        assert_eq!(schema.get("name"), Some(&"Mixed".to_string()));
        assert_eq!(schema.get("score"), Some(&"Number".to_string()));
    }

    #[test]
    fn test_infer_schema_empty_returns_empty_map() {
        let features: Vec<Feature> = vec![];
        let schema = infer_schema(features.iter());
        assert!(schema.is_empty());
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
