use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use serde_json::{Number, Value};

fn to_float_value(v: Value) -> Value {
    match v {
        Value::Number(n) => {
            let f = n.as_f64().unwrap_or(0.0);
            Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null)
        }
        other => other,
    }
}

fn is_truthy(v: &Value) -> bool {
    match v {
        Value::Bool(b) => *b,
        Value::Null => false,
        Value::Number(n) => n.as_f64().map(|f| f != 0.0).unwrap_or(false),
        Value::String(s) => !s.is_empty(),
        _ => true,
    }
}

/// ["case", condition1, output1, condition2, output2, ..., fallback]
/// Evaluates each condition in order; returns the output of the first true condition.
pub struct Case {
    pub branches: Vec<(Expr, Expr)>,
    pub fallback: Expr,
}

impl Expression for Case {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        for (cond, output) in &self.branches {
            let c = cond.evaluate(ctx)?;
            if is_truthy(&c) {
                return output.evaluate(ctx);
            }
        }
        self.fallback.evaluate(ctx)
    }
}

/// ["match", input, label1, output1, label2, output2, ..., fallback]
/// If label is an array, it matches any element. input is compared with ==.
pub struct Match {
    pub input: Expr,
    pub cases: Vec<(Vec<Value>, Expr)>,
    pub fallback: Expr,
}

impl Expression for Match {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let input_val = self.input.evaluate(ctx)?;
        for (labels, output) in &self.cases {
            if labels.iter().any(|label| values_equal(&input_val, label)) {
                return output.evaluate(ctx);
            }
        }
        self.fallback.evaluate(ctx)
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

/// ["step", input, initial_output, stop1, output1, stop2, output2, ...]
/// Returns initial_output if input < stop1, otherwise output for the highest stop <= input.
pub struct Step {
    pub input: Expr,
    pub initial: Expr,
    pub stops: Vec<(Expr, Expr)>,
}

impl Expression for Step {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let input_val = self.input.evaluate(ctx)?;
        let input_f = match &input_val {
            Value::Number(n) => n.as_f64().unwrap_or(0.0),
            _ => return self.initial.evaluate(ctx),
        };

        let mut result_expr: &Expr = &self.initial;
        for (stop_expr, output) in &self.stops {
            let stop_val = stop_expr.evaluate(ctx)?;
            let stop_f = match &stop_val {
                Value::Number(n) => n.as_f64().unwrap_or(f64::MAX),
                _ => continue,
            };
            if input_f >= stop_f {
                result_expr = output;
            } else {
                break;
            }
        }
        result_expr.evaluate(ctx)
    }
}

/// ["coalesce", ...values] — returns the first non-null value.
pub struct Coalesce {
    pub args: Vec<Expr>,
}

impl Expression for Coalesce {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if v != Value::Null {
                return Ok(v);
            }
        }
        Ok(Value::Null)
    }
}

/// ["!in", needle, haystack] — returns true if needle is NOT in haystack (string or array).
pub struct NotIn {
    pub needle: Expr,
    pub haystack: Expr,
}

impl Expression for NotIn {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let needle = self.needle.evaluate(ctx)?;
        let haystack = self.haystack.evaluate(ctx)?;
        let found = match (&needle, &haystack) {
            (Value::String(n), Value::String(h)) => h.contains(n.as_str()),
            (_, Value::Array(arr)) => arr.iter().any(|item| values_equal(item, &needle)),
            _ => false,
        };
        Ok(Value::Bool(!found))
    }
}

/// ["in", needle, haystack] — returns true if needle is in haystack (string or array).
pub struct In {
    pub needle: Expr,
    pub haystack: Expr,
}

impl Expression for In {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let needle = self.needle.evaluate(ctx)?;
        let haystack = self.haystack.evaluate(ctx)?;
        let found = match (&needle, &haystack) {
            (Value::String(n), Value::String(h)) => h.contains(n.as_str()),
            (_, Value::Array(arr)) => arr.iter().any(|item| values_equal(item, &needle)),
            _ => false,
        };
        Ok(Value::Bool(found))
    }
}

/// ["interpolate", ["linear"], input, stop1, val1, stop2, val2, ...]
/// Linear interpolation between numeric stops.
pub struct Interpolate {
    pub input: Expr,
    pub stops: Vec<(f64, Expr)>,
}

impl Expression for Interpolate {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let input_val = self.input.evaluate(ctx)?;
        let input_f = match &input_val {
            Value::Number(n) => n.as_f64().unwrap_or(0.0),
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
                match (&lo_val, &hi_val) {
                    (Value::Number(lo), Value::Number(hi)) => {
                        let lo_f = lo.as_f64().unwrap_or(0.0);
                        let hi_f = hi.as_f64().unwrap_or(0.0);
                        let t = (input_f - lo_stop) / (hi_stop - lo_stop);
                        let result = lo_f + t * (hi_f - lo_f);
                        use serde_json::Number;
                        return Ok(Number::from_f64(result)
                            .map(Value::Number)
                            .unwrap_or(Value::Null));
                    }
                    _ => return Ok(lo_val),
                }
            }
        }

        Ok(Value::Null)
    }
}
