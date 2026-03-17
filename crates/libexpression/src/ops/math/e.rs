use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::Expression;
use crate::Value;
use super::num_val;

/// ["e"] — returns Euler's number.
pub struct MathE;

impl Expression for MathE {
    fn evaluate(&self, _ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(num_val(std::f64::consts::E))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_e() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let result = MathE.evaluate(&ctx).unwrap();
        if let Value::Number(f) = result {
            assert!((f - std::f64::consts::E).abs() < 1e-10);
        } else {
            panic!("expected number");
        }
    }
}
