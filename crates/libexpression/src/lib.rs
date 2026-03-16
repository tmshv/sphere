mod context;
mod error;
mod expr;
mod ops;

pub use context::EvalContext;
pub use error::ExprError;
pub use expr::{Expr, Expression};

use ops::*;
use serde_json::Value;

/// Parse a MapLibre Style Spec expression from a JSON value.
/// Returns a boxed `Expression` that can be evaluated against an `EvalContext`.
pub fn parse(raw: Value) -> Result<Expr, ExprError> {
    match raw {
        // Scalar literals — number, bool, null, string (if not starting with a known operator)
        Value::Number(n) => Ok(Box::new(literal::Literal {
            value: Value::Number(n),
        })),
        Value::Bool(b) => Ok(Box::new(literal::Literal {
            value: Value::Bool(b),
        })),
        Value::Null => Ok(Box::new(literal::Literal { value: Value::Null })),
        Value::String(s) => Ok(Box::new(literal::Literal {
            value: Value::String(s),
        })),
        Value::Object(map) => Ok(Box::new(literal::Literal {
            value: Value::Object(map),
        })),
        Value::Array(arr) => parse_array(arr),
    }
}


fn parse_array(arr: Vec<Value>) -> Result<Expr, ExprError> {
    if arr.is_empty() {
        return Err(ExprError::InvalidExpression(
            "expression array is empty".to_string(),
        ));
    }

    let op = match &arr[0] {
        Value::String(s) => s.clone(),
        // Non-string first element → treat as literal array
        _ => {
            return Ok(Box::new(literal::Literal {
                value: Value::Array(arr),
            }))
        }
    };

    let args = arr[1..].to_vec();

    match op.as_str() {
        // Literal
        "literal" => {
            let val = args.into_iter().next().unwrap_or(Value::Null);
            Ok(Box::new(literal::Literal { value: val }))
        }

        // Data access
        "get" => {
            require_arity(&op, 1..=2, args.len())?;
            let key = parse(args[0].clone())?;
            let object = if args.len() == 2 {
                Some(parse(args[1].clone())?)
            } else {
                None
            };
            Ok(Box::new(data::Get { key, object }))
        }
        "has" => {
            require_arity(&op, 1..=2, args.len())?;
            let key = parse(args[0].clone())?;
            let object = if args.len() == 2 {
                Some(parse(args[1].clone())?)
            } else {
                None
            };
            Ok(Box::new(data::Has { key, object }))
        }
        "id" => {
            require_arity(&op, 0..=0, args.len())?;
            Ok(Box::new(data::Id))
        }
        "geometry-type" => {
            require_arity(&op, 0..=0, args.len())?;
            Ok(Box::new(data::GeometryType))
        }
        "properties" => {
            require_arity(&op, 0..=0, args.len())?;
            Ok(Box::new(data::Properties))
        }
        "at" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(data::At {
                index: parse(args[0].clone())?,
                array: parse(args[1].clone())?,
            }))
        }
        "length" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(data::Length {
                value: parse(args[0].clone())?,
            }))
        }

        // Comparison
        "==" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(comparison::Eq {
                left: parse(args[0].clone())?,
                right: parse(args[1].clone())?,
            }))
        }
        "!=" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(comparison::Ne {
                left: parse(args[0].clone())?,
                right: parse(args[1].clone())?,
            }))
        }
        "<" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(comparison::Lt {
                left: parse(args[0].clone())?,
                right: parse(args[1].clone())?,
            }))
        }
        "<=" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(comparison::Lte {
                left: parse(args[0].clone())?,
                right: parse(args[1].clone())?,
            }))
        }
        ">" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(comparison::Gt {
                left: parse(args[0].clone())?,
                right: parse(args[1].clone())?,
            }))
        }
        ">=" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(comparison::Gte {
                left: parse(args[0].clone())?,
                right: parse(args[1].clone())?,
            }))
        }

        // Logic
        "all" => {
            let parsed: Result<Vec<_>, _> = args.into_iter().map(parse).collect();
            Ok(Box::new(logic::All { args: parsed? }))
        }
        "any" => {
            let parsed: Result<Vec<_>, _> = args.into_iter().map(parse).collect();
            Ok(Box::new(logic::Any { args: parsed? }))
        }
        "!" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(logic::Not {
                arg: parse(args[0].clone())?,
            }))
        }

        // Type coercion
        "to-number" => {
            if args.is_empty() {
                return Err(ExprError::ArityMismatch {
                    operator: op,
                    expected: "1+".to_string(),
                    got: 0,
                });
            }
            let fallbacks: Result<Vec<_>, _> = args[1..].iter().map(|a| parse(a.clone())).collect();
            Ok(Box::new(coerce::ToNumber {
                value: parse(args[0].clone())?,
                fallbacks: fallbacks?,
            }))
        }
        "to-string" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(coerce::ToString {
                value: parse(args[0].clone())?,
            }))
        }
        "to-boolean" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(coerce::ToBoolean {
                value: parse(args[0].clone())?,
            }))
        }
        "typeof" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(coerce::TypeOf {
                value: parse(args[0].clone())?,
            }))
        }

        // String
        "concat" => {
            let parsed: Result<Vec<_>, _> = args.into_iter().map(parse).collect();
            Ok(Box::new(string::Concat { args: parsed? }))
        }
        "downcase" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(string::Downcase {
                value: parse(args[0].clone())?,
            }))
        }
        "upcase" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(string::Upcase {
                value: parse(args[0].clone())?,
            }))
        }
        "slice" => {
            require_arity(&op, 2..=3, args.len())?;
            let to = if args.len() == 3 {
                Some(parse(args[2].clone())?)
            } else {
                None
            };
            Ok(Box::new(string::Slice {
                input: parse(args[0].clone())?,
                from: parse(args[1].clone())?,
                to,
            }))
        }
        "index-of" => {
            require_arity(&op, 2..=3, args.len())?;
            let from = if args.len() == 3 {
                Some(parse(args[2].clone())?)
            } else {
                None
            };
            Ok(Box::new(string::IndexOf {
                needle: parse(args[0].clone())?,
                haystack: parse(args[1].clone())?,
                from,
            }))
        }

        // Math
        "+" => {
            let parsed: Result<Vec<_>, _> = args.into_iter().map(parse).collect();
            Ok(Box::new(math::Add { args: parsed? }))
        }
        "-" => {
            require_arity(&op, 1..=2, args.len())?;
            let right = if args.len() == 2 {
                Some(parse(args[1].clone())?)
            } else {
                None
            };
            Ok(Box::new(math::Sub {
                left: parse(args[0].clone())?,
                right,
            }))
        }
        "*" => {
            let parsed: Result<Vec<_>, _> = args.into_iter().map(parse).collect();
            Ok(Box::new(math::Mul { args: parsed? }))
        }
        "/" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(math::Div {
                left: parse(args[0].clone())?,
                right: parse(args[1].clone())?,
            }))
        }
        "%" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(math::Mod {
                left: parse(args[0].clone())?,
                right: parse(args[1].clone())?,
            }))
        }
        "^" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(math::Pow {
                base: parse(args[0].clone())?,
                exp: parse(args[1].clone())?,
            }))
        }
        "abs" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Abs {
                value: parse(args[0].clone())?,
            }))
        }
        "ceil" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Ceil {
                value: parse(args[0].clone())?,
            }))
        }
        "floor" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Floor {
                value: parse(args[0].clone())?,
            }))
        }
        "round" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Round {
                value: parse(args[0].clone())?,
            }))
        }
        "sqrt" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Sqrt {
                value: parse(args[0].clone())?,
            }))
        }
        "ln" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Ln {
                value: parse(args[0].clone())?,
            }))
        }
        "log2" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Log2 {
                value: parse(args[0].clone())?,
            }))
        }
        "log10" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Log10 {
                value: parse(args[0].clone())?,
            }))
        }
        "acos" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Acos {
                value: parse(args[0].clone())?,
            }))
        }
        "asin" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Asin {
                value: parse(args[0].clone())?,
            }))
        }
        "atan" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Atan {
                value: parse(args[0].clone())?,
            }))
        }
        "cos" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Cos {
                value: parse(args[0].clone())?,
            }))
        }
        "sin" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Sin {
                value: parse(args[0].clone())?,
            }))
        }
        "tan" => {
            require_arity(&op, 1..=1, args.len())?;
            Ok(Box::new(math::Tan {
                value: parse(args[0].clone())?,
            }))
        }
        "min" => {
            let parsed: Result<Vec<_>, _> = args.into_iter().map(parse).collect();
            Ok(Box::new(math::Min { args: parsed? }))
        }
        "max" => {
            let parsed: Result<Vec<_>, _> = args.into_iter().map(parse).collect();
            Ok(Box::new(math::Max { args: parsed? }))
        }
        "e" => {
            require_arity(&op, 0..=0, args.len())?;
            Ok(Box::new(math::MathE))
        }
        "pi" => {
            require_arity(&op, 0..=0, args.len())?;
            Ok(Box::new(math::Pi))
        }

        // Control flow
        "case" => parse_case(args),
        "match" => parse_match(args),
        "step" => parse_step(args),
        "coalesce" => {
            let parsed: Result<Vec<_>, _> = args.into_iter().map(parse).collect();
            Ok(Box::new(control::Coalesce { args: parsed? }))
        }
        "in" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(control::In {
                needle: parse(args[0].clone())?,
                haystack: parse(args[1].clone())?,
            }))
        }
        "!in" => {
            require_arity(&op, 2..=2, args.len())?;
            Ok(Box::new(control::NotIn {
                needle: parse(args[0].clone())?,
                haystack: parse(args[1].clone())?,
            }))
        }
        "interpolate" => parse_interpolate(args),

        // Unknown operator
        other => Err(ExprError::UnknownOperator(other.to_string())),
    }
}

fn require_arity(op: &str, range: std::ops::RangeInclusive<usize>, got: usize) -> Result<(), ExprError> {
    if range.contains(&got) {
        Ok(())
    } else {
        Err(ExprError::ArityMismatch {
            operator: op.to_string(),
            expected: format!("{}-{}", range.start(), range.end()),
            got,
        })
    }
}

fn parse_case(args: Vec<Value>) -> Result<Expr, ExprError> {
    if args.is_empty() {
        return Err(ExprError::InvalidExpression(
            "case requires at least a fallback argument".to_string(),
        ));
    }
    // Must have odd count: pairs of (cond, output) + fallback
    if args.len() % 2 == 0 {
        return Err(ExprError::InvalidExpression(
            "case requires an odd number of arguments".to_string(),
        ));
    }
    let fallback_val = args[args.len() - 1].clone();
    let fallback = parse(fallback_val)?;
    let mut branches = Vec::new();
    let pairs = &args[..args.len() - 1];
    for chunk in pairs.chunks(2) {
        let cond = parse(chunk[0].clone())?;
        let output = parse(chunk[1].clone())?;
        branches.push((cond, output));
    }
    Ok(Box::new(control::Case { branches, fallback }))
}

fn parse_match(args: Vec<Value>) -> Result<Expr, ExprError> {
    if args.len() < 3 {
        return Err(ExprError::InvalidExpression(
            "match requires at least input, one label+output pair, and a fallback".to_string(),
        ));
    }
    // args[0] = input, then pairs (label, output), last = fallback
    // if (args.len() - 1) is odd, that's an error
    if (args.len() - 1) % 2 == 0 {
        return Err(ExprError::InvalidExpression(
            "match requires an odd total number of arguments (input, pairs, fallback)".to_string(),
        ));
    }
    let input = parse(args[0].clone())?;
    let fallback = parse(args[args.len() - 1].clone())?;
    let mut cases = Vec::new();
    let pairs = &args[1..args.len() - 1];
    for chunk in pairs.chunks(2) {
        let labels: Vec<Value> = match &chunk[0] {
            Value::Array(arr) => arr.clone(),
            other => vec![other.clone()],
        };
        let output = parse(chunk[1].clone())?;
        cases.push((labels, output));
    }
    Ok(Box::new(control::Match {
        input,
        cases,
        fallback,
    }))
}

fn parse_step(args: Vec<Value>) -> Result<Expr, ExprError> {
    if args.len() < 3 {
        return Err(ExprError::InvalidExpression(
            "step requires at least input, initial output, and one stop".to_string(),
        ));
    }
    // args[0] = input, args[1] = initial_output, then pairs of (stop, output)
    let input = parse(args[0].clone())?;
    let initial = parse(args[1].clone())?;
    let stop_args = &args[2..];
    if stop_args.len() % 2 != 0 {
        return Err(ExprError::InvalidExpression(
            "step requires an even number of stop arguments (stop_value, output) pairs".to_string(),
        ));
    }
    let mut stops = Vec::new();
    for chunk in stop_args.chunks(2) {
        let stop = parse(chunk[0].clone())?;
        let output = parse(chunk[1].clone())?;
        stops.push((stop, output));
    }
    Ok(Box::new(control::Step {
        input,
        initial,
        stops,
    }))
}

fn parse_interpolate(args: Vec<Value>) -> Result<Expr, ExprError> {
    if args.len() < 4 {
        return Err(ExprError::InvalidExpression(
            "interpolate requires interpolation type, input, and at least one stop pair".to_string(),
        ));
    }
    // args[0] = interpolation type (e.g. ["linear"]), args[1] = input, rest = stop pairs
    // Only "linear" is supported; reject other types explicitly
    match &args[0] {
        Value::Array(interp_type) => match interp_type.first() {
            Some(Value::String(s)) if s == "linear" => {}
            Some(Value::String(s)) => {
                return Err(ExprError::InvalidExpression(format!(
                    "interpolate: unsupported interpolation type \"{}\"",
                    s
                )))
            }
            _ => {
                return Err(ExprError::InvalidExpression(
                    "interpolate: invalid interpolation type".to_string(),
                ))
            }
        },
        _ => {
            return Err(ExprError::InvalidExpression(
                "interpolate: interpolation type must be an array".to_string(),
            ))
        }
    }
    let input = parse(args[1].clone())?;
    let stop_args = &args[2..];
    if stop_args.len() % 2 != 0 {
        return Err(ExprError::InvalidExpression(
            "interpolate requires an even number of stop arguments (stop_value, output) pairs".to_string(),
        ));
    }
    let mut stops: Vec<(f64, Expr)> = Vec::new();
    for chunk in stop_args.chunks(2) {
        let stop_val = match &chunk[0] {
            Value::Number(n) => n.as_f64().unwrap_or(0.0),
            _ => {
                return Err(ExprError::InvalidExpression(
                    "interpolate stop values must be numbers".to_string(),
                ))
            }
        };
        let output = parse(chunk[1].clone())?;
        stops.push((stop_val, output));
    }
    Ok(Box::new(control::Interpolate { input, stops }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Map};

    fn run(raw: Value, props: Value) -> Value {
        let map = match props {
            Value::Object(m) => m,
            _ => Map::new(),
        };
        let ctx = EvalContext {
            feature_id: None,
            feature_type: "Point",
            properties: &map,
        };
        let expr = parse(raw).expect("parse failed");
        expr.evaluate(&ctx).expect("evaluate failed")
    }

    fn run_with_id(raw: Value, props: Value, id: Value) -> Value {
        let map = match props {
            Value::Object(m) => m,
            _ => Map::new(),
        };
        let ctx = EvalContext {
            feature_id: Some(id),
            feature_type: "Point",
            properties: &map,
        };
        let expr = parse(raw).expect("parse failed");
        expr.evaluate(&ctx).expect("evaluate failed")
    }

    // ---- Literal ----

    #[test]
    fn test_literal_number() {
        assert_eq!(run(json!(42), json!({})), json!(42));
    }

    #[test]
    fn test_literal_string() {
        assert_eq!(run(json!("hello"), json!({})), json!("hello"));
    }

    #[test]
    fn test_literal_bool() {
        assert_eq!(run(json!(true), json!({})), json!(true));
    }

    #[test]
    fn test_literal_null() {
        assert_eq!(run(json!(null), json!({})), json!(null));
    }

    #[test]
    fn test_literal_expr() {
        assert_eq!(run(json!(["literal", [1, 2, 3]]), json!({})), json!([1, 2, 3]));
    }

    // ---- Data access ----

    #[test]
    fn test_get_existing_key() {
        assert_eq!(run(json!(["get", "name"]), json!({"name": "Paris"})), json!("Paris"));
    }

    #[test]
    fn test_get_missing_key() {
        assert_eq!(run(json!(["get", "foo"]), json!({})), json!(null));
    }

    #[test]
    fn test_has_existing_key() {
        assert_eq!(run(json!(["has", "name"]), json!({"name": "Paris"})), json!(true));
    }

    #[test]
    fn test_has_missing_key() {
        assert_eq!(run(json!(["has", "foo"]), json!({})), json!(false));
    }

    #[test]
    fn test_id() {
        assert_eq!(run_with_id(json!(["id"]), json!({}), json!(42)), json!(42));
    }

    #[test]
    fn test_id_null() {
        assert_eq!(run(json!(["id"]), json!({})), json!(null));
    }

    #[test]
    fn test_geometry_type() {
        let map = Map::new();
        let ctx = EvalContext {
            feature_id: None,
            feature_type: "Polygon",
            properties: &map,
        };
        let expr = parse(json!(["geometry-type"])).unwrap();
        assert_eq!(expr.evaluate(&ctx).unwrap(), json!("Polygon"));
    }

    #[test]
    fn test_at() {
        assert_eq!(
            run(json!(["at", 1, ["literal", [10, 20, 30]]]), json!({})),
            json!(20)
        );
    }

    #[test]
    fn test_length_string() {
        assert_eq!(run(json!(["length", "hello"]), json!({})), json!(5));
    }

    #[test]
    fn test_length_array() {
        assert_eq!(run(json!(["length", ["literal", [1, 2, 3]]]), json!({})), json!(3));
    }

    // ---- Comparison ----

    #[test]
    fn test_eq_numbers() {
        assert_eq!(run(json!(["==", 1, 1]), json!({})), json!(true));
        assert_eq!(run(json!(["==", 1, 2]), json!({})), json!(false));
    }

    #[test]
    fn test_eq_strings() {
        assert_eq!(run(json!(["==", "a", "a"]), json!({})), json!(true));
        assert_eq!(run(json!(["==", "a", "b"]), json!({})), json!(false));
    }

    #[test]
    fn test_eq_null() {
        assert_eq!(run(json!(["==", null, null]), json!({})), json!(true));
        assert_eq!(run(json!(["==", null, 0]), json!({})), json!(false));
    }

    #[test]
    fn test_ne() {
        assert_eq!(run(json!(["!=", 1, 2]), json!({})), json!(true));
        assert_eq!(run(json!(["!=", 1, 1]), json!({})), json!(false));
    }

    #[test]
    fn test_lt() {
        assert_eq!(run(json!(["<", 1, 2]), json!({})), json!(true));
        assert_eq!(run(json!(["<", 2, 1]), json!({})), json!(false));
        assert_eq!(run(json!(["<", 1, 1]), json!({})), json!(false));
    }

    #[test]
    fn test_lte() {
        assert_eq!(run(json!(["<=", 1, 2]), json!({})), json!(true));
        assert_eq!(run(json!(["<=", 1, 1]), json!({})), json!(true));
        assert_eq!(run(json!(["<=", 2, 1]), json!({})), json!(false));
        // incomparable types must return false, not true
        assert_eq!(run(json!(["<=", "a", 1]), json!({})), json!(false));
    }

    #[test]
    fn test_gt() {
        assert_eq!(run(json!([">", 2, 1]), json!({})), json!(true));
        assert_eq!(run(json!([">", 1, 2]), json!({})), json!(false));
    }

    #[test]
    fn test_gte() {
        assert_eq!(run(json!([">=", 2, 1]), json!({})), json!(true));
        assert_eq!(run(json!([">=", 1, 1]), json!({})), json!(true));
        assert_eq!(run(json!([">=", 1, 2]), json!({})), json!(false));
        // incomparable types must return false, not true
        assert_eq!(run(json!([">=", 1, "a"]), json!({})), json!(false));
    }

    #[test]
    fn test_string_comparison() {
        assert_eq!(run(json!(["<", "a", "b"]), json!({})), json!(true));
        assert_eq!(run(json!([">", "z", "a"]), json!({})), json!(true));
    }

    // ---- Logic ----

    #[test]
    fn test_all_true() {
        assert_eq!(run(json!(["all", true, true, true]), json!({})), json!(true));
    }

    #[test]
    fn test_all_false() {
        assert_eq!(run(json!(["all", true, false, true]), json!({})), json!(false));
    }

    #[test]
    fn test_all_empty() {
        assert_eq!(run(json!(["all"]), json!({})), json!(true));
    }

    #[test]
    fn test_any_true() {
        assert_eq!(run(json!(["any", false, true, false]), json!({})), json!(true));
    }

    #[test]
    fn test_any_false() {
        assert_eq!(run(json!(["any", false, false]), json!({})), json!(false));
    }

    #[test]
    fn test_not() {
        assert_eq!(run(json!(["!", true]), json!({})), json!(false));
        assert_eq!(run(json!(["!", false]), json!({})), json!(true));
        assert_eq!(run(json!(["!", null]), json!({})), json!(true));
    }

    #[test]
    fn test_nested_logic() {
        // all(any(false, true), !(false))
        let expr = json!(["all", ["any", false, true], ["!", false]]);
        assert_eq!(run(expr, json!({})), json!(true));
    }

    // ---- Type coercion ----

    #[test]
    fn test_to_number_from_string() {
        assert_eq!(run(json!(["to-number", "42"]), json!({})), json!(42.0));
    }

    #[test]
    fn test_to_number_from_null() {
        assert_eq!(run(json!(["to-number", null]), json!({})), json!(null));
    }

    #[test]
    fn test_to_number_with_fallback() {
        // fallback is a literal integer 0, returned as-is
        assert_eq!(run(json!(["to-number", null, 0]), json!({})), json!(0));
    }

    #[test]
    fn test_to_string_number() {
        assert_eq!(run(json!(["to-string", 42]), json!({})), json!("42"));
    }

    #[test]
    fn test_to_string_null() {
        assert_eq!(run(json!(["to-string", null]), json!({})), json!(""));
    }

    #[test]
    fn test_typeof_number() {
        assert_eq!(run(json!(["typeof", 1]), json!({})), json!("number"));
    }

    #[test]
    fn test_typeof_string() {
        assert_eq!(run(json!(["typeof", "hello"]), json!({})), json!("string"));
    }

    #[test]
    fn test_typeof_bool() {
        assert_eq!(run(json!(["typeof", true]), json!({})), json!("boolean"));
    }

    #[test]
    fn test_typeof_null() {
        assert_eq!(run(json!(["typeof", null]), json!({})), json!("null"));
    }

    #[test]
    fn test_typeof_array() {
        assert_eq!(run(json!(["typeof", ["literal", [1, 2]]]), json!({})), json!("array"));
    }

    // ---- String ----

    #[test]
    fn test_concat() {
        assert_eq!(run(json!(["concat", "Hello", " ", "World"]), json!({})), json!("Hello World"));
    }

    #[test]
    fn test_concat_mixed() {
        assert_eq!(run(json!(["concat", "Value: ", 42]), json!({})), json!("Value: 42"));
    }

    #[test]
    fn test_downcase() {
        assert_eq!(run(json!(["downcase", "HELLO"]), json!({})), json!("hello"));
    }

    #[test]
    fn test_upcase() {
        assert_eq!(run(json!(["upcase", "hello"]), json!({})), json!("HELLO"));
    }

    #[test]
    fn test_slice_string() {
        assert_eq!(run(json!(["slice", "hello", 1, 3]), json!({})), json!("el"));
    }

    #[test]
    fn test_slice_string_to_end() {
        assert_eq!(run(json!(["slice", "hello", 2]), json!({})), json!("llo"));
    }

    #[test]
    fn test_index_of_found() {
        assert_eq!(run(json!(["index-of", "ll", "hello"]), json!({})), json!(2i64));
    }

    #[test]
    fn test_index_of_not_found() {
        assert_eq!(run(json!(["index-of", "xyz", "hello"]), json!({})), json!(-1i64));
    }

    #[test]
    fn test_index_of_array() {
        assert_eq!(
            run(json!(["index-of", 2, ["literal", [1, 2, 3]]]), json!({})),
            json!(1i64)
        );
    }

    // ---- Math ----

    #[test]
    fn test_add() {
        assert_eq!(run(json!(["+", 1, 2, 3]), json!({})), json!(6.0));
    }

    #[test]
    fn test_sub() {
        assert_eq!(run(json!(["-", 10, 3]), json!({})), json!(7.0));
    }

    #[test]
    fn test_negate() {
        assert_eq!(run(json!(["-", 5]), json!({})), json!(-5.0));
    }

    #[test]
    fn test_mul() {
        assert_eq!(run(json!(["*", 2, 3, 4]), json!({})), json!(24.0));
    }

    #[test]
    fn test_div() {
        assert_eq!(run(json!(["/", 10, 2]), json!({})), json!(5.0));
    }

    #[test]
    fn test_div_by_zero() {
        assert_eq!(run(json!(["/", 10, 0]), json!({})), json!(null));
    }

    #[test]
    fn test_mod_op() {
        assert_eq!(run(json!(["%", 10, 3]), json!({})), json!(1.0));
    }

    #[test]
    fn test_pow() {
        assert_eq!(run(json!(["^", 2, 10]), json!({})), json!(1024.0));
    }

    #[test]
    fn test_abs() {
        assert_eq!(run(json!(["abs", -5]), json!({})), json!(5.0));
    }

    #[test]
    fn test_ceil() {
        assert_eq!(run(json!(["ceil", 1.3]), json!({})), json!(2.0));
    }

    #[test]
    fn test_floor() {
        assert_eq!(run(json!(["floor", 1.9]), json!({})), json!(1.0));
    }

    #[test]
    fn test_round() {
        assert_eq!(run(json!(["round", 1.5]), json!({})), json!(2.0));
        assert_eq!(run(json!(["round", 1.4]), json!({})), json!(1.0));
    }

    #[test]
    fn test_sqrt() {
        assert_eq!(run(json!(["sqrt", 4]), json!({})), json!(2.0));
    }

    #[test]
    fn test_min() {
        assert_eq!(run(json!(["min", 3, 1, 2]), json!({})), json!(1.0));
    }

    #[test]
    fn test_max() {
        assert_eq!(run(json!(["max", 3, 1, 2]), json!({})), json!(3.0));
    }

    #[test]
    fn test_e() {
        let v = run(json!(["e"]), json!({}));
        if let Value::Number(n) = v {
            let f = n.as_f64().unwrap();
            assert!((f - std::f64::consts::E).abs() < 1e-10);
        } else {
            panic!("expected number");
        }
    }

    #[test]
    fn test_pi() {
        let v = run(json!(["pi"]), json!({}));
        if let Value::Number(n) = v {
            let f = n.as_f64().unwrap();
            assert!((f - std::f64::consts::PI).abs() < 1e-10);
        } else {
            panic!("expected number");
        }
    }

    // ---- Control flow ----

    #[test]
    fn test_case_first_match() {
        let expr = json!(["case", true, "yes", false, "no", "fallback"]);
        assert_eq!(run(expr, json!({})), json!("yes"));
    }

    #[test]
    fn test_case_fallback() {
        let expr = json!(["case", false, "yes", "fallback"]);
        assert_eq!(run(expr, json!({})), json!("fallback"));
    }

    #[test]
    fn test_case_with_condition() {
        let expr = json!(["case", ["==", ["get", "type"], "airport"], "Airport", "Unknown"]);
        assert_eq!(
            run(expr.clone(), json!({"type": "airport"})),
            json!("Airport")
        );
        assert_eq!(run(expr, json!({"type": "seaport"})), json!("Unknown"));
    }

    #[test]
    fn test_match_single_label() {
        let expr = json!(["match", ["get", "type"], "airport", "Airport", "seaport", "Seaport", "Unknown"]);
        assert_eq!(run(expr.clone(), json!({"type": "airport"})), json!("Airport"));
        assert_eq!(run(expr.clone(), json!({"type": "seaport"})), json!("Seaport"));
        assert_eq!(run(expr, json!({"type": "other"})), json!("Unknown"));
    }

    #[test]
    fn test_match_array_label() {
        let expr = json!(["match", ["get", "type"], ["airport", "airstrip"], "Air", "Unknown"]);
        assert_eq!(run(expr.clone(), json!({"type": "airport"})), json!("Air"));
        assert_eq!(run(expr.clone(), json!({"type": "airstrip"})), json!("Air"));
        assert_eq!(run(expr, json!({"type": "other"})), json!("Unknown"));
    }

    #[test]
    fn test_step() {
        let expr = json!(["step", ["get", "zoom"], "tiny", 5, "small", 10, "medium", 20, "large"]);
        assert_eq!(run(expr.clone(), json!({"zoom": 3})), json!("tiny"));
        assert_eq!(run(expr.clone(), json!({"zoom": 5})), json!("small"));
        assert_eq!(run(expr.clone(), json!({"zoom": 15})), json!("medium"));
        assert_eq!(run(expr, json!({"zoom": 25})), json!("large"));
    }

    #[test]
    fn test_coalesce_returns_first_non_null() {
        let expr = json!(["coalesce", null, null, "found", "ignored"]);
        assert_eq!(run(expr, json!({})), json!("found"));
    }

    #[test]
    fn test_coalesce_all_null() {
        let expr = json!(["coalesce", null, null]);
        assert_eq!(run(expr, json!({})), json!(null));
    }

    #[test]
    fn test_in_string() {
        assert_eq!(run(json!(["in", "ll", "hello"]), json!({})), json!(true));
        assert_eq!(run(json!(["in", "xyz", "hello"]), json!({})), json!(false));
    }

    #[test]
    fn test_in_array() {
        assert_eq!(
            run(json!(["in", 2, ["literal", [1, 2, 3]]]), json!({})),
            json!(true)
        );
        assert_eq!(
            run(json!(["in", 5, ["literal", [1, 2, 3]]]), json!({})),
            json!(false)
        );
    }

    #[test]
    fn test_not_in_string() {
        assert_eq!(run(json!(["!in", "ll", "hello"]), json!({})), json!(false));
        assert_eq!(run(json!(["!in", "xyz", "hello"]), json!({})), json!(true));
    }

    #[test]
    fn test_not_in_array() {
        assert_eq!(
            run(json!(["!in", 2, ["literal", [1, 2, 3]]]), json!({})),
            json!(false)
        );
        assert_eq!(
            run(json!(["!in", 5, ["literal", [1, 2, 3]]]), json!({})),
            json!(true)
        );
    }

    #[test]
    fn test_interpolate_linear() {
        let expr = json!(["interpolate", ["linear"], ["get", "value"], 0, 0, 10, 100]);
        assert_eq!(run(expr.clone(), json!({"value": 5})), json!(50.0));
        assert_eq!(run(expr.clone(), json!({"value": 0})), json!(0.0));
        assert_eq!(run(expr, json!({"value": 10})), json!(100.0));
    }

    // ---- Unknown operator ----

    #[test]
    fn test_unknown_operator_returns_err() {
        let result = parse(json!(["unknownOp", 1, 2]));
        assert!(result.is_err());
        assert!(matches!(result.err().unwrap(), ExprError::UnknownOperator(_)));
    }

    // ---- Fuzz: arbitrary JSON never panics ----

    #[test]
    fn test_fuzz_never_panics() {
        let cases = vec![
            json!([]),
            json!(["==", 1]),
            json!(["case"]),
            json!(["match", "x"]),
            json!(["unknown-op-xyz"]),
            json!([1, 2, 3]),
            json!([null, null]),
            json!(["get"]),
            json!(["/", 0, 0]),
        ];
        for case in cases {
            // Should either parse with Ok or return Err — never panic
            let result = parse(case);
            match result {
                Ok(expr) => {
                    let map = Map::new();
                    let ctx = EvalContext {
                        feature_id: None,
                        feature_type: "Point",
                        properties: &map,
                    };
                    // evaluate may return Ok or Err, but must not panic
                    let _ = expr.evaluate(&ctx);
                }
                Err(_) => {} // expected for invalid expressions
            }
        }
    }

    // ---- Complex real-world filters ----

    #[test]
    fn test_airport_filter() {
        let expr = json!(["==", ["get", "type"], "airport"]);
        assert_eq!(run(expr.clone(), json!({"type": "airport"})), json!(true));
        assert_eq!(run(expr, json!({"type": "helipad"})), json!(false));
    }

    #[test]
    fn test_population_range_filter() {
        let expr = json!(["all",
            [">=", ["get", "population"], 1000000],
            ["<", ["get", "population"], 5000000]
        ]);
        assert_eq!(run(expr.clone(), json!({"population": 2000000})), json!(true));
        assert_eq!(run(expr.clone(), json!({"population": 500000})), json!(false));
        assert_eq!(run(expr, json!({"population": 5000000})), json!(false));
    }

    #[test]
    fn test_get_from_object_expr() {
        let expr = json!(["get", "name", ["properties"]]);
        assert_eq!(run(expr, json!({"name": "test"})), json!("test"));
    }
}
