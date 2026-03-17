use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::Expression;
use crate::Value;

/// ["id"] — returns the feature's id.
pub struct Id;

impl Expression for Id {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(ctx.feature_id.clone().unwrap_or(Value::Null))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_id_present() {
        let props = HashMap::new();
        let ctx = EvalContext { feature_id: Some(Value::Number(42.0)), feature_type: "Point", properties: &props };
        assert_eq!(Id.evaluate(&ctx).unwrap(), Value::Number(42.0));
    }

    #[test]
    fn test_id_absent() {
        let props = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        assert_eq!(Id.evaluate(&ctx).unwrap(), Value::Null);
    }
}
