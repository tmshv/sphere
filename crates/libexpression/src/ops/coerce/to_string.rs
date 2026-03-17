use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;

/// ["to-string", value] — coerces value to a string.
pub struct ToString {
    pub value: Expr,
}

impl Expression for ToString {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        let s = match v {
            Value::String(s) => s,
            Value::Null => String::new(),
            Value::Bool(b) => b.to_string(),
            Value::Number(f) => f.to_string(),
            other => format!("{:?}", other),
        };
        Ok(Value::String(s))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_to_string_number() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = ToString { value: Box::new(Literal { value: Value::Number(42.0) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("42".to_string()));
    }

    #[test]
    fn test_to_string_null() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = ToString { value: Box::new(Literal { value: Value::Null }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String(String::new()));
    }

    #[test]
    fn test_to_string_bool() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = ToString { value: Box::new(Literal { value: Value::Bool(true) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("true".to_string()));
    }
}
