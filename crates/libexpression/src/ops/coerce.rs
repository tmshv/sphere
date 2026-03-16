use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use serde_json::{Number, Value};

/// ["to-number", value, fallback*, ...] — coerces value to a number; tries each fallback in order on failure.
pub struct ToNumber {
    pub value: Expr,
    pub fallbacks: Vec<Expr>,
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
            _ => None,
        };

        if let Some(v) = result {
            return Ok(v);
        }

        for fb in &self.fallbacks {
            let fb_val = fb.evaluate(ctx)?;
            let converted = match &fb_val {
                Value::Number(_) => return Ok(fb_val),
                Value::String(s) => s
                    .trim()
                    .parse::<f64>()
                    .ok()
                    .and_then(|f| Number::from_f64(f))
                    .map(Value::Number),
                _ => None,
            };
            if let Some(v) = converted {
                return Ok(v);
            }
        }

        Ok(Value::Null)
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
