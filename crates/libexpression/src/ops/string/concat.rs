use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::to_str;

/// ["concat", ...values] — concatenates all values as strings.
pub struct Concat {
    pub args: Vec<Expr>,
}

impl Expression for Concat {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let mut result = String::new();
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            result.push_str(&to_str(v));
        }
        Ok(Value::String(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_concat_strings() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Concat {
            args: vec![
                Box::new(Literal { value: Value::String("Hello".to_string()) }),
                Box::new(Literal { value: Value::String(" World".to_string()) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("Hello World".to_string()));
    }

    #[test]
    fn test_concat_mixed() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Concat {
            args: vec![
                Box::new(Literal { value: Value::String("Value: ".to_string()) }),
                Box::new(Literal { value: Value::Number(42.0) }),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("Value: 42".to_string()));
    }
}
