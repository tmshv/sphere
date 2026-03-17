use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::util::values_equal;

/// ["==", left, right]
pub struct Eq {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Eq {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        Ok(Value::Bool(values_equal(&l, &r)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_eq_same_numbers() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Eq {
            left: Box::new(Literal { value: Value::Number(1.0) }),
            right: Box::new(Literal { value: Value::Number(1.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }

    #[test]
    fn test_eq_different_numbers() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Eq {
            left: Box::new(Literal { value: Value::Number(1.0) }),
            right: Box::new(Literal { value: Value::Number(2.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }

    #[test]
    fn test_eq_null_null() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Eq {
            left: Box::new(Literal { value: Value::Null }),
            right: Box::new(Literal { value: Value::Null }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }

    #[test]
    fn test_eq_cross_type_false() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Eq {
            left: Box::new(Literal { value: Value::Number(0.0) }),
            right: Box::new(Literal { value: Value::Null }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }
}
