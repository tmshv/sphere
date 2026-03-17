use libexpression::{evaluate, parse, EvalContext, Value};
use std::collections::HashMap;

fn run(expr: &str, props: &str) -> Value {
    let expr_json: serde_json::Value = serde_json::from_str(expr).expect("invalid expr json");
    let props_json: serde_json::Value = serde_json::from_str(props).expect("invalid props json");
    let props: HashMap<String, Value> = match props_json {
        serde_json::Value::Object(m) => {
            m.into_iter().map(|(k, v)| (k, Value::from(v))).collect()
        }
        _ => HashMap::new(),
    };
    let ctx = EvalContext {
        feature_id: None,
        feature_type: "Point",
        properties: &props,
    };
    let expr = parse(expr_json).expect("parse failed");
    evaluate(&expr, &ctx).expect("evaluate failed")
}

fn b(v: bool) -> Value { Value::Bool(v) }
fn n(f: f64) -> Value { Value::Number(f) }
fn s(v: &str) -> Value { Value::String(v.to_string()) }
fn null() -> Value { Value::Null }

// ---- Literals ----

#[test]
fn literals() {
    assert_eq!(run("42", "{}"), n(42.0));
    assert_eq!(run(r#""hello""#, "{}"), s("hello"));
    assert_eq!(run("true", "{}"), b(true));
    assert_eq!(run("null", "{}"), null());
    assert_eq!(
        run(r#"["literal", [1, 2, 3]]"#, "{}"),
        Value::Array(vec![n(1.0), n(2.0), n(3.0)])
    );
}

// ---- Data access ----

#[test]
fn data_get() {
    assert_eq!(run(r#"["get", "name"]"#, r#"{"name": "Heathrow"}"#), s("Heathrow"));
    assert_eq!(run(r#"["get", "name"]"#, "{}"), null());
    // ["get", key, object_expr]
    assert_eq!(
        run(r#"["get", "iata", ["properties"]]"#, r#"{"iata": "LHR"}"#),
        s("LHR")
    );
}

#[test]
fn data_has() {
    assert_eq!(run(r#"["has", "elevation"]"#, r#"{"elevation": 450}"#), b(true));
    assert_eq!(run(r#"["has", "elevation"]"#, "{}"), b(false));
}

#[test]
fn data_id() {
    let expr_json: serde_json::Value = serde_json::from_str(r#"["id"]"#).unwrap();
    let props: HashMap<String, Value> = HashMap::new();

    let ctx_with_id = EvalContext {
        feature_id: Some(Value::Number(42.0)),
        feature_type: "Point",
        properties: &props,
    };
    let expr = parse(expr_json.clone()).unwrap();
    assert_eq!(evaluate(&expr, &ctx_with_id).unwrap(), n(42.0));

    let ctx_no_id = EvalContext {
        feature_id: None,
        feature_type: "Point",
        properties: &props,
    };
    let expr = parse(expr_json).unwrap();
    assert_eq!(evaluate(&expr, &ctx_no_id).unwrap(), null());
}

#[test]
fn data_geometry_type() {
    let expr_json: serde_json::Value = serde_json::from_str(r#"["geometry-type"]"#).unwrap();
    let props: HashMap<String, Value> = HashMap::new();

    let ctx_point = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
    let expr = parse(expr_json.clone()).unwrap();
    assert_eq!(evaluate(&expr, &ctx_point).unwrap(), s("Point"));

    let ctx_polygon = EvalContext { feature_id: None, feature_type: "Polygon", properties: &props };
    let expr = parse(expr_json).unwrap();
    assert_eq!(evaluate(&expr, &ctx_polygon).unwrap(), s("Polygon"));
}

#[test]
fn data_properties() {
    let result = run(r#"["properties"]"#, r#"{"name": "LAX", "code": "KLAX"}"#);
    let mut expected = HashMap::new();
    expected.insert("name".to_string(), s("LAX"));
    expected.insert("code".to_string(), s("KLAX"));
    assert_eq!(result, Value::Object(expected));
}

#[test]
fn data_at() {
    assert_eq!(run(r#"["at", 0, ["literal", ["a", "b", "c"]]]"#, "{}"), s("a"));
    assert_eq!(run(r#"["at", -1, ["literal", ["a", "b", "c"]]]"#, "{}"), s("c"));
}

#[test]
fn data_length() {
    assert_eq!(run(r#"["length", "hello"]"#, "{}"), n(5.0));
    assert_eq!(run(r#"["length", ["literal", [1, 2, 3, 4]]]"#, "{}"), n(4.0));
}

// ---- Comparison ----

#[test]
fn comparison_eq() {
    assert_eq!(
        run(r#"["==", ["get", "type"], "small_airport"]"#, r#"{"type": "small_airport"}"#),
        b(true)
    );
    assert_eq!(
        run(r#"["==", ["get", "type"], "small_airport"]"#, r#"{"type": "large_airport"}"#),
        b(false)
    );
    // Cross-type is always false
    assert_eq!(run(r#"["==", 1, "1"]"#, "{}"), b(false));
}

#[test]
fn comparison_ne() {
    assert_eq!(
        run(r#"["!=", ["get", "status"], "closed"]"#, r#"{"status": "open"}"#),
        b(true)
    );
    assert_eq!(
        run(r#"["!=", ["get", "status"], "closed"]"#, r#"{"status": "closed"}"#),
        b(false)
    );
}

#[test]
fn comparison_ordered() {
    // Numeric comparison
    assert_eq!(
        run(r#"[">=", ["get", "elevation"], 1000]"#, r#"{"elevation": 1200}"#),
        b(true)
    );
    assert_eq!(
        run(r#"[">=", ["get", "elevation"], 1000]"#, r#"{"elevation": 450}"#),
        b(false)
    );
    assert_eq!(run(r#"["<", 1, 2]"#, "{}"), b(true));
    assert_eq!(run(r#"["<=", 1, 1]"#, "{}"), b(true));
    assert_eq!(run(r#"[">", 2, 1]"#, "{}"), b(true));
}

#[test]
fn comparison_string() {
    // String comparison (lexicographic)
    assert_eq!(
        run(r#"["<", ["get", "name"], "M"]"#, r#"{"name": "Heathrow"}"#),
        b(true)
    );
    assert_eq!(
        run(r#"["<", ["get", "name"], "M"]"#, r#"{"name": "Schiphol"}"#),
        b(false)
    );
}

// ---- Logic ----

#[test]
fn logic_all() {
    assert_eq!(
        run(
            r#"["all", ["==", ["get", "type"], "small_airport"], [">=", ["get", "elevation"], 0]]"#,
            r#"{"type": "small_airport", "elevation": 450}"#
        ),
        b(true)
    );
    assert_eq!(
        run(
            r#"["all", ["==", ["get", "type"], "small_airport"], [">=", ["get", "elevation"], 0]]"#,
            r#"{"type": "small_airport", "elevation": -5}"#
        ),
        b(false)
    );
}

#[test]
fn logic_any() {
    assert_eq!(
        run(
            r#"["any", ["==", ["get", "type"], "small_airport"], ["==", ["get", "type"], "heliport"]]"#,
            r#"{"type": "heliport"}"#
        ),
        b(true)
    );
    assert_eq!(
        run(
            r#"["any", ["==", ["get", "type"], "small_airport"], ["==", ["get", "type"], "heliport"]]"#,
            r#"{"type": "large_airport"}"#
        ),
        b(false)
    );
}

#[test]
fn logic_not() {
    assert_eq!(run(r#"["!", ["has", "elevation"]]"#, r#"{"elevation": 450}"#), b(false));
    assert_eq!(run(r#"["!", ["has", "elevation"]]"#, "{}"), b(true));
}

// ---- Type coercion ----

#[test]
fn coerce_to_number() {
    assert_eq!(
        run(r#"["to-number", ["get", "elevation"]]"#, r#"{"elevation": "1200"}"#),
        n(1200.0)
    );
    assert_eq!(
        run(r#"["to-number", ["get", "elevation"]]"#, r#"{"elevation": null}"#),
        null()
    );
    // fallback used when conversion fails
    assert_eq!(
        run(r#"["to-number", ["get", "code"], 0]"#, r#"{"code": "LHR"}"#),
        n(0.0)
    );
}

#[test]
fn coerce_to_string() {
    assert_eq!(
        run(r#"["to-string", ["get", "elevation"]]"#, r#"{"elevation": 1200}"#),
        s("1200")
    );
    assert_eq!(
        run(r#"["to-string", ["get", "elevation"]]"#, r#"{"elevation": null}"#),
        s("")
    );
}

#[test]
fn coerce_to_boolean() {
    assert_eq!(run(r#"["to-boolean", ["get", "active"]]"#, r#"{"active": 1}"#), b(true));
    assert_eq!(run(r#"["to-boolean", ["get", "active"]]"#, r#"{"active": 0}"#), b(false));
    assert_eq!(run(r#"["to-boolean", ["get", "active"]]"#, r#"{"active": ""}"#), b(false));
}

#[test]
fn coerce_typeof() {
    assert_eq!(
        run(r#"["typeof", ["get", "elevation"]]"#, r#"{"elevation": 450}"#),
        s("number")
    );
    assert_eq!(
        run(r#"["typeof", ["get", "elevation"]]"#, r#"{"elevation": "hi"}"#),
        s("string")
    );
    assert_eq!(run(r#"["typeof", ["get", "elevation"]]"#, "{}"), s("null"));
}

// ---- String ops ----

#[test]
fn string_concat() {
    assert_eq!(
        run(
            r#"["concat", ["get", "city"], " (", ["get", "iata"], ")"]"#,
            r#"{"city": "London", "iata": "LHR"}"#
        ),
        s("London (LHR)")
    );
}

#[test]
fn string_downcase_upcase() {
    assert_eq!(
        run(r#"["downcase", ["get", "name"]]"#, r#"{"name": "Heathrow"}"#),
        s("heathrow")
    );
    assert_eq!(
        run(r#"["upcase", ["get", "code"]]"#, r#"{"code": "lhr"}"#),
        s("LHR")
    );
}

#[test]
fn string_slice() {
    assert_eq!(
        run(r#"["slice", ["get", "iata"], 0, 2]"#, r#"{"iata": "EGLL"}"#),
        s("EG")
    );
    assert_eq!(
        run(r#"["slice", ["get", "iata"], -2]"#, r#"{"iata": "EGLL"}"#),
        s("LL")
    );
}

#[test]
fn string_index_of() {
    assert_eq!(
        run(r#"["index-of", "port", ["get", "name"]]"#, r#"{"name": "Heathrow Airport"}"#),
        n(12.0)
    );
    assert_eq!(
        run(r#"["index-of", "port", ["get", "name"]]"#, r#"{"name": "Heathrow"}"#),
        n(-1.0)
    );
    // Works on arrays too
    assert_eq!(
        run(r#"["index-of", "b", ["literal", ["a", "b", "c"]]]"#, "{}"),
        n(1.0)
    );
}

// ---- Math ----

#[test]
fn math_arithmetic() {
    assert_eq!(run(r#"["+", 1, 2, 3]"#, "{}"), n(6.0));
    assert_eq!(run(r#"["*", 2, 3, 4]"#, "{}"), n(24.0));
    assert_eq!(run(r#"["-", 10, 3]"#, "{}"), n(7.0));
    assert_eq!(run(r#"["/", 10, 4]"#, "{}"), n(2.5));
    assert_eq!(run(r#"["%", 10, 3]"#, "{}"), n(1.0));
    assert_eq!(run(r#"["^", 2, 8]"#, "{}"), n(256.0));
}

#[test]
fn math_unary() {
    assert_eq!(
        run(r#"["-", ["get", "elevation"]]"#, r#"{"elevation": 450}"#),
        n(-450.0)
    );
}

#[test]
fn math_min_max() {
    assert_eq!(
        run(r#"["min", ["get", "a"], ["get", "b"], 100]"#, r#"{"a": 42, "b": 75}"#),
        n(42.0)
    );
    assert_eq!(
        run(r#"["max", ["get", "a"], ["get", "b"], 100]"#, r#"{"a": 42, "b": 75}"#),
        n(100.0)
    );
    assert_eq!(run(r#"["round", 3.7]"#, "{}"), n(4.0));
    assert_eq!(run(r#"["floor", 3.7]"#, "{}"), n(3.0));
    assert_eq!(run(r#"["ceil",  3.2]"#, "{}"), n(4.0));
    assert_eq!(run(r#"["abs",  -5.5]"#, "{}"), n(5.5));
    assert_eq!(run(r#"["sqrt",    9]"#, "{}"), n(3.0));
}

#[test]
fn math_transcendental() {
    let ln_e = run(r#"["ln", ["e"]]"#, "{}");
    if let Value::Number(f) = ln_e {
        assert!((f - 1.0).abs() < 1e-10, "ln(e) should be 1.0, got {f}");
    } else {
        panic!("expected number");
    }

    let log2_8 = run(r#"["log2", 8]"#, "{}");
    assert_eq!(log2_8, n(3.0));

    let log10_100 = run(r#"["log10", 100]"#, "{}");
    assert_eq!(log10_100, n(2.0));

    let pi = run(r#"["pi"]"#, "{}");
    if let Value::Number(f) = pi {
        assert!((f - std::f64::consts::PI).abs() < 1e-10);
    } else {
        panic!("expected number");
    }
}

// ---- Control flow ----

#[test]
fn control_case() {
    let expr = r#"["case",
        ["<", ["get", "elevation"], 0],    "below sea level",
        ["<", ["get", "elevation"], 1000], "lowland",
        "highland"
    ]"#;
    assert_eq!(run(expr, r#"{"elevation": -10}"#), s("below sea level"));
    assert_eq!(run(expr, r#"{"elevation": 450}"#), s("lowland"));
    assert_eq!(run(expr, r#"{"elevation": 2000}"#), s("highland"));
}

#[test]
fn control_match() {
    let expr = r#"["match", ["get", "type"],
        "small_airport",  "small",
        ["large_airport", "medium_airport"], "large or medium",
        "other"
    ]"#;
    assert_eq!(run(expr, r#"{"type": "small_airport"}"#), s("small"));
    assert_eq!(run(expr, r#"{"type": "large_airport"}"#), s("large or medium"));
    assert_eq!(run(expr, r#"{"type": "medium_airport"}"#), s("large or medium"));
    assert_eq!(run(expr, r#"{"type": "heliport"}"#), s("other"));
}

#[test]
fn control_coalesce() {
    let expr = r#"["coalesce", ["get", "name"], ["get", "code"], "unknown"]"#;
    assert_eq!(run(expr, r#"{"name": "Heathrow"}"#), s("Heathrow"));
    assert_eq!(run(expr, r#"{"code": "LHR"}"#), s("LHR"));
    assert_eq!(run(expr, "{}"), s("unknown"));
}

#[test]
fn control_step() {
    let expr = r#"["step", ["get", "elevation"],
        "unknown",
        0,    "sea level",
        500,  "low",
        2000, "high"
    ]"#;
    assert_eq!(run(expr, r#"{"elevation": -5}"#), s("unknown"));
    assert_eq!(run(expr, r#"{"elevation": 0}"#), s("sea level"));
    assert_eq!(run(expr, r#"{"elevation": 800}"#), s("low"));
    assert_eq!(run(expr, r#"{"elevation": 3000}"#), s("high"));
}

#[test]
fn control_interpolate() {
    let expr = r#"["interpolate", ["linear"], ["get", "elevation"],
        0,    0.0,
        1000, 0.5,
        4000, 1.0
    ]"#;
    assert_eq!(run(expr, r#"{"elevation": 0}"#), n(0.0));
    assert_eq!(run(expr, r#"{"elevation": 500}"#), n(0.25));
    assert_eq!(run(expr, r#"{"elevation": 1000}"#), n(0.5));
    assert_eq!(run(expr, r#"{"elevation": 4000}"#), n(1.0));
    // Clamped above last stop
    assert_eq!(run(expr, r#"{"elevation": 5000}"#), n(1.0));
}

// ---- Membership ----

#[test]
fn membership_in() {
    // Substring check
    assert_eq!(
        run(r#"["in", "port", ["get", "name"]]"#, r#"{"name": "Heathrow Airport"}"#),
        b(true)
    );
    assert_eq!(
        run(r#"["in", "port", ["get", "name"]]"#, r#"{"name": "Heathrow"}"#),
        b(false)
    );
    // Array membership
    assert_eq!(
        run(
            r#"["in", ["get", "type"], ["literal", ["small_airport", "heliport"]]]"#,
            r#"{"type": "heliport"}"#
        ),
        b(true)
    );
    assert_eq!(
        run(
            r#"["in", ["get", "type"], ["literal", ["small_airport", "heliport"]]]"#,
            r#"{"type": "large_airport"}"#
        ),
        b(false)
    );
}

#[test]
fn membership_not_in() {
    assert_eq!(
        run(
            r#"["!in", ["get", "type"], ["literal", ["closed", "restricted"]]]"#,
            r#"{"type": "small_airport"}"#
        ),
        b(true)
    );
    assert_eq!(
        run(
            r#"["!in", ["get", "type"], ["literal", ["closed", "restricted"]]]"#,
            r#"{"type": "closed"}"#
        ),
        b(false)
    );
}
