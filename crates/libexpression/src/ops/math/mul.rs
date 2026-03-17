use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::{to_f64, num_val};

/// ["*", ...values] — product of numeric values.
pub struct Mul {
    pub args: Vec<Expr>,
}

impl Expression for Mul {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let mut product = 1.0f64;
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            product *= to_f64(&v).unwrap_or(0.0);
        }
        Ok(num_val(product))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_mul() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Mul {
            args: vec![
                Box::new(Literal { value: Value::Number(2.0) }),
                Box::new(Literal { value: Value::Number(3.0) }),
                Box::new(Literal { value: Value::Number(4.0) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(24.0));
    }
}
