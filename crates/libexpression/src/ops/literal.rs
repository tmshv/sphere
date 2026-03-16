use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::Expression;
use serde_json::Value;

/// Returns the literal value as-is.
pub struct Literal {
    pub value: Value,
}

impl Expression for Literal {
    fn evaluate(&self, _ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(self.value.clone())
    }
}
