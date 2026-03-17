use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::util::is_truthy;

/// ["to-boolean", value] — coerces value to a boolean.
pub struct ToBoolean {
    pub value: Expr,
}

impl Expression for ToBoolean {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        Ok(Value::Bool(is_truthy(&v)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_to_boolean_truthy() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = ToBoolean { value: Box::new(Literal { value: Value::Number(1.0) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }

    #[test]
    fn test_to_boolean_null_falsy() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = ToBoolean { value: Box::new(Literal { value: Value::Null }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }
}
