use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::util::values_equal;

/// ["index-of", needle, haystack, from_index?] — returns the index of needle in haystack, or -1.
pub struct IndexOf {
    pub needle: Expr,
    pub haystack: Expr,
    pub from: Option<Expr>,
}

impl Expression for IndexOf {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let needle = self.needle.evaluate(ctx)?;
        let haystack = self.haystack.evaluate(ctx)?;
        let from_i = if let Some(f) = &self.from {
            let fv = f.evaluate(ctx)?;
            match fv {
                Value::Number(n) => (n as i64).max(0) as usize,
                _ => 0,
            }
        } else {
            0
        };

        match (&needle, &haystack) {
            (Value::String(n), Value::String(h)) => {
                let h_chars: Vec<char> = h.chars().collect();
                let n_chars: Vec<char> = n.chars().collect();
                let search_from = from_i.min(h_chars.len());
                let mut found = -1i64;
                'outer: for i in search_from..=h_chars.len().saturating_sub(n_chars.len()) {
                    if h_chars[i..].starts_with(&n_chars) {
                        found = i as i64;
                        break 'outer;
                    }
                }
                Ok(Value::Number(found as f64))
            }
            (_, Value::Array(arr)) => {
                let from_i = from_i.min(arr.len());
                let result = arr[from_i..]
                    .iter()
                    .position(|item| values_equal(item, &needle))
                    .map(|pos| (pos + from_i) as i64)
                    .unwrap_or(-1);
                Ok(Value::Number(result as f64))
            }
            _ => Ok(Value::Number(-1.0)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_index_of_found() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = IndexOf {
            needle: Box::new(Literal { value: Value::String("ll".to_string()) }),
            haystack: Box::new(Literal { value: Value::String("hello".to_string()) }),
            from: None,
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(2.0));
    }

    #[test]
    fn test_index_of_not_found() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = IndexOf {
            needle: Box::new(Literal { value: Value::String("xyz".to_string()) }),
            haystack: Box::new(Literal { value: Value::String("hello".to_string()) }),
            from: None,
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(-1.0));
    }
}
