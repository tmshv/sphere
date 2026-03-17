use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::compare_values;
use std::cmp::Ordering;

/// [">", left, right]
pub struct Gt {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Gt {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        Ok(Value::Bool(compare_values(&l, &r) == Some(Ordering::Greater)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_gt_true() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Gt {
            left: Box::new(Literal { value: Value::Number(2.0) }),
            right: Box::new(Literal { value: Value::Number(1.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }

    #[test]
    fn test_gt_false() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Gt {
            left: Box::new(Literal { value: Value::Number(1.0) }),
            right: Box::new(Literal { value: Value::Number(2.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }
}
