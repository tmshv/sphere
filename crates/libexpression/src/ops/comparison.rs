use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use serde_json::Value;
use std::cmp::Ordering;

fn compare_values(a: &Value, b: &Value) -> Option<Ordering> {
    match (a, b) {
        (Value::Number(x), Value::Number(y)) => {
            let xf = x.as_f64()?;
            let yf = y.as_f64()?;
            xf.partial_cmp(&yf)
        }
        (Value::String(x), Value::String(y)) => Some(x.cmp(y)),
        _ => None,
    }
}

fn values_equal(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Null, Value::Null) => true,
        (Value::Bool(x), Value::Bool(y)) => x == y,
        (Value::Number(x), Value::Number(y)) => x.as_f64() == y.as_f64(),
        (Value::String(x), Value::String(y)) => x == y,
        (Value::Array(x), Value::Array(y)) => x == y,
        (Value::Object(x), Value::Object(y)) => x == y,
        _ => false,
    }
}

/// ["==", left, right]
pub struct Eq {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Eq {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        Ok(Value::Bool(values_equal(&l, &r)))
    }
}

/// ["!=", left, right]
pub struct Ne {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Ne {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        Ok(Value::Bool(!values_equal(&l, &r)))
    }
}

/// ["<", left, right]
pub struct Lt {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Lt {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        Ok(Value::Bool(
            compare_values(&l, &r) == Some(Ordering::Less),
        ))
    }
}

/// ["<=", left, right]
pub struct Lte {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Lte {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        Ok(Value::Bool(matches!(
            compare_values(&l, &r),
            Some(Ordering::Less | Ordering::Equal)
        )))
    }
}

/// [">", left, right]
pub struct Gt {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Gt {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        Ok(Value::Bool(
            compare_values(&l, &r) == Some(Ordering::Greater),
        ))
    }
}

/// [">=", left, right]
pub struct Gte {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Gte {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        Ok(Value::Bool(matches!(
            compare_values(&l, &r),
            Some(Ordering::Greater | Ordering::Equal)
        )))
    }
}
