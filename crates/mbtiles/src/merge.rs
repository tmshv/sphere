use serde_json::Value;

pub fn merge(a: &mut Value, b: Value) {
    match (a, b) {
        (a @ &mut Value::Object(_), Value::Object(b)) => {
            let a = a.as_object_mut().unwrap();
            for (k, v) in b {
                merge(a.entry(k).or_insert(Value::Null), v);
            }
        }
        (a, b) => *a = b,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn adds_keys_that_are_missing_from_the_target() {
        let mut a = json!({ "name": "tiles" });

        merge(&mut a, json!({ "format": "pbf" }));

        assert_eq!(a, json!({ "name": "tiles", "format": "pbf" }));
    }

    #[test]
    fn the_incoming_value_wins_on_a_conflict() {
        let mut a = json!({ "format": "jpeg" });

        merge(&mut a, json!({ "format": "pbf" }));

        assert_eq!(a, json!({ "format": "pbf" }));
    }

    #[test]
    fn nested_objects_are_merged_key_by_key() {
        let mut a = json!({ "meta": { "name": "tiles", "version": "1" } });

        merge(&mut a, json!({ "meta": { "version": "2", "author": "me" } }));

        assert_eq!(
            a,
            json!({ "meta": { "name": "tiles", "version": "2", "author": "me" } })
        );
    }

    #[test]
    fn an_array_replaces_rather_than_appends() {
        let mut a = json!({ "vector_layers": [{ "id": "a" }] });

        merge(&mut a, json!({ "vector_layers": [{ "id": "b" }] }));

        assert_eq!(a, json!({ "vector_layers": [{ "id": "b" }] }));
    }

    #[test]
    fn a_scalar_target_is_overwritten_by_an_object() {
        let mut a = json!({ "meta": "none" });

        merge(&mut a, json!({ "meta": { "name": "tiles" } }));

        assert_eq!(a, json!({ "meta": { "name": "tiles" } }));
    }

    #[test]
    fn merging_an_empty_object_changes_nothing() {
        let mut a = json!({ "name": "tiles" });

        merge(&mut a, json!({}));

        assert_eq!(a, json!({ "name": "tiles" }));
    }
}
