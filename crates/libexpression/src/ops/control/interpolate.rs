use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use crate::ops::math::num_val;

/// ["interpolate", ["linear"], input, stop1, val1, stop2, val2, ...]
/// Linear interpolation between numeric stops.
pub struct Interpolate {
    pub input: Expr,
    pub stops: Vec<(f64, Expr)>,
}

fn to_float_value(v: Value) -> Value {
    match v {
        Value::Number(_) => v,
        other => other,
    }
}

impl Expression for Interpolate {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let input_val = self.input.evaluate(ctx)?;
        let input_f = match &input_val {
            Value::Number(f) => *f,
            _ => return Ok(Value::Null),
        };

        if self.stops.is_empty() {
            return Ok(Value::Null);
        }

        // Below first stop
        if input_f <= self.stops[0].0 {
            let v = self.stops[0].1.evaluate(ctx)?;
            return Ok(to_float_value(v));
        }

        // Above last stop
        if input_f >= self.stops[self.stops.len() - 1].0 {
            let v = self.stops[self.stops.len() - 1].1.evaluate(ctx)?;
            return Ok(to_float_value(v));
        }

        // Find the two stops to interpolate between
        for i in 0..self.stops.len() - 1 {
            let (lo_stop, ref lo_expr) = self.stops[i];
            let (hi_stop, ref hi_expr) = self.stops[i + 1];
            if input_f >= lo_stop && input_f <= hi_stop {
                let lo_val = lo_expr.evaluate(ctx)?;
                let hi_val = hi_expr.evaluate(ctx)?;
                match (lo_val, hi_val) {
                    (Value::Number(lo_f), Value::Number(hi_f)) => {
                        let t = (input_f - lo_stop) / (hi_stop - lo_stop);
                        let result = lo_f + t * (hi_f - lo_f);
                        return Ok(num_val(result));
                    }
                    (lo, _) => return Ok(lo),
                }
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
    fn test_interpolate_midpoint() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Interpolate {
            input: Box::new(Literal { value: Value::Number(5.0) }),
            stops: vec![
                (0.0, Box::new(Literal { value: Value::Number(0.0) })),
                (10.0, Box::new(Literal { value: Value::Number(100.0) })),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(50.0));
    }

    #[test]
    fn test_interpolate_at_stop() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Interpolate {
            input: Box::new(Literal { value: Value::Number(0.0) }),
            stops: vec![
                (0.0, Box::new(Literal { value: Value::Number(0.0) })),
                (10.0, Box::new(Literal { value: Value::Number(100.0) })),
            ],
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(0.0));
    }
}
