use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::{to_f64, num_val};

/// ["/", a, b] — division; returns null on divide-by-zero.
pub struct Div {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Div {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        let lf = to_f64(&l).unwrap_or(0.0);
        let rf = to_f64(&r).unwrap_or(0.0);
        if rf == 0.0 {
            Ok(Value::Null)
        } else {
            Ok(num_val(lf / rf))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_div() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Div {
            left: Box::new(Literal { value: Value::Number(10.0) }),
            right: Box::new(Literal { value: Value::Number(2.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(5.0));
    }

    #[test]
    fn test_div_by_zero() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Div {
            left: Box::new(Literal { value: Value::Number(10.0) }),
            right: Box::new(Literal { value: Value::Number(0.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Null);
    }
}
