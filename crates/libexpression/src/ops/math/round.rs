use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::{to_f64, num_val};

pub struct Round {
    pub value: Expr,
}

impl Expression for Round {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        match to_f64(&v) {
            Some(f) => Ok(num_val(f.round())),
            None => Ok(Value::Null),
        }
    }
}
