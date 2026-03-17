use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::Expression;
use crate::Value;

/// ["geometry-type"] — returns the feature's geometry type string.
pub struct GeometryType;

impl Expression for GeometryType {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(Value::String(ctx.feature_type.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_geometry_type() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Polygon", properties: &props };
        assert_eq!(GeometryType.evaluate(&ctx).unwrap(), Value::String("Polygon".to_string()));
    }
}
