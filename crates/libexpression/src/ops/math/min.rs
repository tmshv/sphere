use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::{to_f64, num_val};

/// ["min", ...values] — minimum of numeric values.
pub struct Min {
    pub args: Vec<Expr>,
}

impl Expression for Min {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let mut min: Option<f64> = None;
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if let Some(f) = to_f64(&v) {
                min = Some(min.map(|m: f64| m.min(f)).unwrap_or(f));
            }
        }
        Ok(min.map(num_val).unwrap_or(Value::Null))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_min() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Min {
            args: vec![
                Box::new(Literal { value: Value::Number(3.0) }),
                Box::new(Literal { value: Value::Number(1.0) }),
                Box::new(Literal { value: Value::Number(2.0) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(1.0));
    }
}
