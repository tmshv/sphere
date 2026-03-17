use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;

/// ["typeof", value] — returns the type name string of the value.
pub struct TypeOf {
    pub value: Expr,
}

impl Expression for TypeOf {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        let t = match &v {
            Value::Null => "null",
            Value::Bool(_) => "boolean",
            Value::Number(_) => "number",
            Value::String(_) => "string",
            Value::Array(_) => "array",
            Value::Object(_) => "object",
        };
        Ok(Value::String(t.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_typeof_number() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = TypeOf { value: Box::new(Literal { value: Value::Number(1.0) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("number".to_string()));
    }

    #[test]
    fn test_typeof_null() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = TypeOf { value: Box::new(Literal { value: Value::Null }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("null".to_string()));
    }

    #[test]
    fn test_typeof_string() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = TypeOf { value: Box::new(Literal { value: Value::String("x".to_string()) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("string".to_string()));
    }

    #[test]
    fn test_typeof_bool() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = TypeOf { value: Box::new(Literal { value: Value::Bool(true) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("boolean".to_string()));
    }

    #[test]
    fn test_typeof_array() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = TypeOf { value: Box::new(Literal { value: Value::Array(vec![]) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("array".to_string()));
    }

    #[test]
    fn test_typeof_object() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = TypeOf { value: Box::new(Literal { value: Value::Object(HashMap::new()) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("object".to_string()));
    }
}
