use geojson::Feature;
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

#[cfg(test)]
mod tests {
    use super::*;
    use geojson::{Feature, Geometry, Value as GeoValue};
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
}
