use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::util::values_equal;

/// ["!in", needle, haystack] — returns true if needle is NOT in haystack (string or array).
pub struct NotIn {
    pub needle: Expr,
    pub haystack: Expr,
}

impl Expression for NotIn {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let needle = self.needle.evaluate(ctx)?;
        let haystack = self.haystack.evaluate(ctx)?;
        let found = match (&needle, &haystack) {
            (Value::String(n), Value::String(h)) => h.contains(n.as_str()),
            (_, Value::Array(arr)) => arr.iter().any(|item| values_equal(item, &needle)),
            _ => false,
        };
        Ok(Value::Bool(!found))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_not_in_string() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = NotIn {
            needle: Box::new(Literal { value: Value::String("ll".to_string()) }),
            haystack: Box::new(Literal { value: Value::String("hello".to_string()) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }

    #[test]
    fn test_not_in_string_not_found() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = NotIn {
            needle: Box::new(Literal { value: Value::String("xyz".to_string()) }),
            haystack: Box::new(Literal { value: Value::String("hello".to_string()) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }
}
