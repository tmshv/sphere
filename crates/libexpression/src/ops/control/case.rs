use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::util::is_truthy;

/// ["case", condition1, output1, condition2, output2, ..., fallback]
/// Evaluates each condition in order; returns the output of the first true condition.
pub struct Case {
    pub branches: Vec<(Expr, Expr)>,
    pub fallback: Expr,
}

impl Expression for Case {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        for (cond, output) in &self.branches {
            let c = cond.evaluate(ctx)?;
            if is_truthy(&c) {
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
    fn test_case_first_match() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Case {
            branches: vec![
                (Box::new(Literal { value: Value::Bool(true) }), Box::new(Literal { value: Value::String("yes".to_string()) })),
                (Box::new(Literal { value: Value::Bool(false) }), Box::new(Literal { value: Value::String("no".to_string()) })),
            ],
            fallback: Box::new(Literal { value: Value::String("fallback".to_string()) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("yes".to_string()));
    }

    #[test]
    fn test_case_fallback() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Case {
            branches: vec![
                (Box::new(Literal { value: Value::Bool(false) }), Box::new(Literal { value: Value::String("yes".to_string()) })),
            ],
            fallback: Box::new(Literal { value: Value::String("fallback".to_string()) }),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("fallback".to_string()));
    }
}
