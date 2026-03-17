use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::{to_f64, num_val};

/// ["-", a, b?] — if one arg: negation; if two args: subtraction.
pub struct Sub {
    pub left: Expr,
    pub right: Option<Expr>,
}

impl Expression for Sub {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let lf = to_f64(&l).unwrap_or(0.0);
        if let Some(r_expr) = &self.right {
            let r = r_expr.evaluate(ctx)?;
            let rf = to_f64(&r).unwrap_or(0.0);
            Ok(num_val(lf - rf))
        } else {
            Ok(num_val(-lf))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_sub() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Sub {
            left: Box::new(Literal { value: Value::Number(10.0) }),
            right: Some(Box::new(Literal { value: Value::Number(3.0) })),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(7.0));
    }

    #[test]
    fn test_negate() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Sub {
            left: Box::new(Literal { value: Value::Number(5.0) }),
            right: None,
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(-5.0));
    }
}
