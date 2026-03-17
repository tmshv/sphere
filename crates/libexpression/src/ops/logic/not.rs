use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::util::is_truthy;

/// ["!", expr] — logical negation.
pub struct Not {
    pub arg: Expr,
}

impl Expression for Not {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.arg.evaluate(ctx)?;
        Ok(Value::Bool(!is_truthy(&v)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_not_true() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Not { arg: Box::new(Literal { value: Value::Bool(true) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }

    #[test]
    fn test_not_null() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Not { arg: Box::new(Literal { value: Value::Null }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }
}
