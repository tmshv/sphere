use crate::context::EvalContext;
use crate::error::ExprError;
use crate::Value;

/// Core expression trait. All expression types implement this.
pub trait Expression: Send + Sync {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError>;
}

/// A boxed, type-erased expression.
pub type Expr = Box<dyn Expression>;
