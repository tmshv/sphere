use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;

/// ["step", input, initial_output, stop1, output1, stop2, output2, ...]
/// Returns initial_output if input < stop1, otherwise output for the highest stop <= input.
pub struct Step {
    pub input: Expr,
    pub initial: Expr,
    pub stops: Vec<(Expr, Expr)>,
}

impl Expression for Step {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let input_val = self.input.evaluate(ctx)?;
        let input_f = match &input_val {
            Value::Number(f) => *f,
            _ => return self.initial.evaluate(ctx),
        };

        let mut result_expr: &Expr = &self.initial;
        for (stop_expr, output) in &self.stops {
            let stop_val = stop_expr.evaluate(ctx)?;
            let stop_f = match &stop_val {
                Value::Number(f) => *f,
                _ => continue,
            };
            if input_f >= stop_f {
                result_expr = output;
            } else {
                break;
            }
        }
        result_expr.evaluate(ctx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_step_initial() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Step {
            input: Box::new(Literal { value: Value::Number(3.0) }),
            initial: Box::new(Literal { value: Value::String("tiny".to_string()) }),
            stops: vec![
                (Box::new(Literal { value: Value::Number(5.0) }), Box::new(Literal { value: Value::String("small".to_string()) })),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("tiny".to_string()));
    }

    #[test]
    fn test_step_match() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Step {
            input: Box::new(Literal { value: Value::Number(5.0) }),
            initial: Box::new(Literal { value: Value::String("tiny".to_string()) }),
            stops: vec![
                (Box::new(Literal { value: Value::Number(5.0) }), Box::new(Literal { value: Value::String("small".to_string()) })),
                (Box::new(Literal { value: Value::Number(10.0) }), Box::new(Literal { value: Value::String("medium".to_string()) })),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("small".to_string()));
    }
}
