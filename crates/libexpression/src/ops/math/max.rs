use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::{to_f64, num_val};

/// ["max", ...values] — maximum of numeric values.
pub struct Max {
    pub args: Vec<Expr>,
}

impl Expression for Max {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let mut max: Option<f64> = None;
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if let Some(f) = to_f64(&v) {
                max = Some(max.map(|m: f64| m.max(f)).unwrap_or(f));
            }
        }
        Ok(max.map(num_val).unwrap_or(Value::Null))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_max() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Max {
            args: vec![
                Box::new(Literal { value: Value::Number(3.0) }),
                Box::new(Literal { value: Value::Number(1.0) }),
                Box::new(Literal { value: Value::Number(2.0) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(3.0));
    }
}
