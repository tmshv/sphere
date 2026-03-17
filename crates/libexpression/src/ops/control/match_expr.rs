use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::util::values_equal;

/// ["match", input, label1, output1, label2, output2, ..., fallback]
/// If label is an array, it matches any element. input is compared with ==.
pub struct Match {
    pub input: Expr,
    pub cases: Vec<(Vec<Value>, Expr)>,
    pub fallback: Expr,
}

impl Expression for Match {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let input_val = self.input.evaluate(ctx)?;
        for (labels, output) in &self.cases {
            if labels.iter().any(|label| values_equal(&input_val, label)) {
                return output.evaluate(ctx);
            }
        }
        self.fallback.evaluate(ctx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_match_single_label() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Match {
            input: Box::new(Literal { value: Value::String("airport".to_string()) }),
            cases: vec![
                (vec![Value::String("airport".to_string())], Box::new(Literal { value: Value::String("Airport".to_string()) })),
            ],
            fallback: Box::new(Literal { value: Value::String("Unknown".to_string()) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("Airport".to_string()));
    }

    #[test]
    fn test_match_fallback() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Match {
            input: Box::new(Literal { value: Value::String("other".to_string()) }),
            cases: vec![
                (vec![Value::String("airport".to_string())], Box::new(Literal { value: Value::String("Airport".to_string()) })),
            ],
            fallback: Box::new(Literal { value: Value::String("Unknown".to_string()) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("Unknown".to_string()));
    }
}
