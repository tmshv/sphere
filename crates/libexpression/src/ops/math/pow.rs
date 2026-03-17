use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::{to_f64, num_val};

/// ["^", a, b] — power.
pub struct Pow {
    pub base: Expr,
    pub exp: Expr,
}

impl Expression for Pow {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let b = self.base.evaluate(ctx)?;
        let e = self.exp.evaluate(ctx)?;
        let bf = to_f64(&b).unwrap_or(0.0);
        let ef = to_f64(&e).unwrap_or(0.0);
        Ok(num_val(bf.powf(ef)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_pow() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Pow {
            base: Box::new(Literal { value: Value::Number(2.0) }),
            exp: Box::new(Literal { value: Value::Number(10.0) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(1024.0));
    }
}
