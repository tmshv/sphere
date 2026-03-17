use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::util::is_truthy;

/// ["all", expr...] — returns true if all args are truthy.
pub struct All {
    pub args: Vec<Expr>,
}

impl Expression for All {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if !is_truthy(&v) {
                return Ok(Value::Bool(false));
            }
        }
        Ok(Value::Bool(true))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_all_true() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = All {
            args: vec![
                Box::new(Literal { value: Value::Bool(true) }),
                Box::new(Literal { value: Value::Bool(true) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }

    #[test]
    fn test_all_false() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = All {
            args: vec![
                Box::new(Literal { value: Value::Bool(true) }),
                Box::new(Literal { value: Value::Bool(false) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }

    #[test]
    fn test_all_empty() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = All { args: vec![] };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }
}
