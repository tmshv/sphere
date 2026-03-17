use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;

fn try_to_number(v: &Value) -> Option<Value> {
    match v {
        Value::Number(_) => Some(v.clone()),
        Value::String(s) => s
            .trim()
            .parse::<f64>()
            .ok()
            .filter(|f| f.is_finite())
            .map(Value::Number),
        _ => None,
    }
}

/// ["to-number", value, fallback*, ...] — coerces value to a number; tries each fallback in order on failure.
pub struct ToNumber {
    pub value: Expr,
    pub fallbacks: Vec<Expr>,
}

impl Expression for ToNumber {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        if let Some(result) = try_to_number(&v) {
            return Ok(result);
        }
        for fb in &self.fallbacks {
            let fb_val = fb.evaluate(ctx)?;
            if let Some(result) = try_to_number(&fb_val) {
                return Ok(result);
            }
        }
        Ok(Value::Null)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_to_number_from_string() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = ToNumber {
            value: Box::new(Literal { value: Value::String("42".to_string()) }),
            fallbacks: vec![],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(42.0));
    }

    #[test]
    fn test_to_number_from_null_with_fallback() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = ToNumber {
            value: Box::new(Literal { value: Value::Null }),
            fallbacks: vec![Box::new(Literal { value: Value::Number(0.0) })],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(0.0));
    }

    #[test]
    fn test_to_number_all_null() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = ToNumber {
            value: Box::new(Literal { value: Value::Null }),
            fallbacks: vec![],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Null);
    }
}
