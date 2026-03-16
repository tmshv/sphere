use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use serde_json::Value;

fn is_truthy(v: &Value) -> bool {
    match v {
        Value::Bool(b) => *b,
        Value::Null => false,
        Value::Number(n) => n.as_f64().map(|f| f != 0.0).unwrap_or(false),
        Value::String(s) => !s.is_empty(),
        _ => true,
    }
}

/// ["all", expr...] — returns true if all args are truthy.
pub struct All {
    pub args: Vec<Expr>,
}

impl Expression for All {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if !is_truthy(&v) {
                return Ok(Value::Bool(false));
            }
        }
        Ok(Value::Bool(true))
    }
}

/// ["any", expr...] — returns true if any arg is truthy.
pub struct Any {
    pub args: Vec<Expr>,
}

impl Expression for Any {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if is_truthy(&v) {
                return Ok(Value::Bool(true));
            }
        }
        Ok(Value::Bool(false))
    }
}

/// ["!", expr] — logical negation.
pub struct Not {
    pub arg: Expr,
}

impl Expression for Not {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.arg.evaluate(ctx)?;
        Ok(Value::Bool(!is_truthy(&v)))
    }
}
