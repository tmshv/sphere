use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use serde_json::{Number, Value};

/// ["to-number", value, fallback?] — coerces value to a number; returns null or fallback on failure.
pub struct ToNumber {
    pub value: Expr,
    pub fallback: Option<Expr>,
}

impl Expression for ToNumber {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        let result = match &v {
            Value::Number(_) => return Ok(v),
            Value::String(s) => s
                .trim()
                .parse::<f64>()
                .ok()
                .and_then(|f| Number::from_f64(f))
                .map(Value::Number),
            Value::Bool(b) => {
                let n = if *b { 1.0f64 } else { 0.0f64 };
                Number::from_f64(n).map(Value::Number)
            }
            Value::Null => None,
            _ => None,
        };

        match result {
            Some(v) => Ok(v),
            None => {
                if let Some(fb) = &self.fallback {
                    fb.evaluate(ctx)
                } else {
                    Ok(Value::Null)
                }
            }
        }
    }
}

/// ["to-string", value] — coerces value to a string.
pub struct ToString {
    pub value: Expr,
}

impl Expression for ToString {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        let s = match &v {
            Value::String(s) => s.clone(),
            Value::Null => String::new(),
            Value::Bool(b) => b.to_string(),
            Value::Number(n) => n.to_string(),
            other => other.to_string(),
        };
        Ok(Value::String(s))
    }
}

/// ["to-boolean", value] — coerces value to a boolean.
pub struct ToBoolean {
    pub value: Expr,
}

impl Expression for ToBoolean {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        let b = match &v {
            Value::Bool(b) => *b,
            Value::Null => false,
            Value::Number(n) => n.as_f64().map(|f| f != 0.0).unwrap_or(false),
            Value::String(s) => !s.is_empty(),
            _ => true,
        };
        Ok(Value::Bool(b))
    }
}

/// ["typeof", value] — returns the type name string of the value.
pub struct TypeOf {
    pub value: Expr,
}

impl Expression for TypeOf {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        let t = match &v {
            Value::Null => "null",
            Value::Bool(_) => "boolean",
            Value::Number(_) => "number",
            Value::String(_) => "string",
            Value::Array(_) => "array",
            Value::Object(_) => "object",
        };
        Ok(Value::String(t.to_string()))
    }
}
