use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;

/// ["coalesce", ...values] — returns the first non-null value.
pub struct Coalesce {
    pub args: Vec<Expr>,
}

impl Expression for Coalesce {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if v != Value::Null {
                return Ok(v);
            }
        }
        Ok(Value::Null)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_coalesce_returns_first_non_null() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Coalesce {
            args: vec![
                Box::new(Literal { value: Value::Null }),
                Box::new(Literal { value: Value::Null }),
                Box::new(Literal { value: Value::String("found".to_string()) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("found".to_string()));
    }

    #[test]
    fn test_coalesce_all_null() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Coalesce {
            args: vec![
                Box::new(Literal { value: Value::Null }),
                Box::new(Literal { value: Value::Null }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Null);
    }
}
