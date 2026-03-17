use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::Expression;
use crate::Value;

/// ["properties"] — returns the entire properties object.
pub struct Properties;

impl Expression for Properties {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(Value::Object(ctx.properties.clone()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_properties_returns_object() {
        let mut props = HashMap::new();
        props.insert("key".to_string(), Value::Number(1.0));
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let result = Properties.evaluate(&ctx).unwrap();
        assert!(matches!(result, Value::Object(_)));
    }
}
