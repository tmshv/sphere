use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::compare_values;
use std::cmp::Ordering;

/// ["<=", left, right]
pub struct Lte {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Lte {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        Ok(Value::Bool(matches!(compare_values(&l, &r), Some(Ordering::Less | Ordering::Equal))))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_lte_less() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Lte {
            left: Box::new(Literal { value: Value::Number(1.0) }),
            right: Box::new(Literal { value: Value::Number(2.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }

    #[test]
    fn test_lte_equal() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Lte {
            left: Box::new(Literal { value: Value::Number(1.0) }),
            right: Box::new(Literal { value: Value::Number(1.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }

    #[test]
    fn test_lte_greater() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Lte {
            left: Box::new(Literal { value: Value::Number(2.0) }),
            right: Box::new(Literal { value: Value::Number(1.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }
}
