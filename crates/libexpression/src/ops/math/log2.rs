use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::{to_f64, num_val};

pub struct Log2 {
    pub value: Expr,
}

impl Expression for Log2 {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        match to_f64(&v) {
            Some(f) => Ok(num_val(f.log2())),
            None => Ok(Value::Null),
        }
    }
}
