use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::util::is_truthy;

/// ["any", expr...] — returns true if any arg is truthy.
pub struct Any {
    pub args: Vec<Expr>,
}

impl Expression for Any {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if is_truthy(&v) {
                return Ok(Value::Bool(true));
            }
        }
        Ok(Value::Bool(false))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_any_true() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Any {
            args: vec![
                Box::new(Literal { value: Value::Bool(false) }),
                Box::new(Literal { value: Value::Bool(true) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }

    #[test]
    fn test_any_false() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Any {
            args: vec![
                Box::new(Literal { value: Value::Bool(false) }),
                Box::new(Literal { value: Value::Bool(false) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }
}
