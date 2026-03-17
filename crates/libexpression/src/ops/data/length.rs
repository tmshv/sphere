use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;

/// ["length", value_expr] — returns the length of string or array.
pub struct Length {
    pub value: Expr,
}

impl Expression for Length {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let val = self.value.evaluate(ctx)?;
        match val {
            Value::String(s) => Ok(Value::Number(s.chars().count() as f64)),
            Value::Array(a) => Ok(Value::Number(a.len() as f64)),
            _ => Ok(Value::Null),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_length_string() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Length { value: Box::new(Literal { value: Value::String("hello".to_string()) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(5.0));
    }

    #[test]
    fn test_length_array() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Length { value: Box::new(Literal { value: Value::Array(vec![Value::Null, Value::Null, Value::Null]) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(3.0));
    }

    #[test]
    fn test_length_null() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Length { value: Box::new(Literal { value: Value::Null }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Null);
    }
}
