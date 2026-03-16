use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use serde_json::Value;

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

fn to_str(v: Value) -> String {
    match v {
        Value::String(s) => s,
        Value::Null => String::new(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        other => other.to_string(),
    }
}

/// ["concat", ...values] — concatenates all values as strings.
pub struct Concat {
    pub args: Vec<Expr>,
}

impl Expression for Concat {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let mut result = String::new();
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            result.push_str(&to_str(v));
        }
        Ok(Value::String(result))
    }
}

/// ["downcase", string] — converts string to lowercase.
pub struct Downcase {
    pub value: Expr,
}

impl Expression for Downcase {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        Ok(Value::String(to_str(v).to_lowercase()))
    }
}

/// ["upcase", string] — converts string to uppercase.
pub struct Upcase {
    pub value: Expr,
}

impl Expression for Upcase {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        Ok(Value::String(to_str(v).to_uppercase()))
    }
}

/// ["slice", input, from_index, to_index?] — extracts a substring or subarray.
pub struct Slice {
    pub input: Expr,
    pub from: Expr,
    pub to: Option<Expr>,
}

impl Expression for Slice {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let input = self.input.evaluate(ctx)?;
        let from_val = self.from.evaluate(ctx)?;
        let from_i = from_val.as_i64().unwrap_or(0);

        match input {
            Value::String(s) => {
                let chars: Vec<char> = s.chars().collect();
                let len = chars.len() as i64;
                let start = if from_i < 0 {
                    (len + from_i).max(0) as usize
                } else {
                    from_i.min(len) as usize
                };
                let end = if let Some(to_expr) = &self.to {
                    let to_val = to_expr.evaluate(ctx)?;
                    let to_i = to_val.as_i64().unwrap_or(len);
                    if to_i < 0 {
                        (len + to_i).max(0) as usize
                    } else {
                        to_i.min(len) as usize
                    }
                } else {
                    len as usize
                };
                let result: String = chars[start..end.max(start)]
                    .iter()
                    .collect();
                Ok(Value::String(result))
            }
            Value::Array(arr) => {
                let len = arr.len() as i64;
                let start = if from_i < 0 {
                    (len + from_i).max(0) as usize
                } else {
                    from_i.min(len) as usize
                };
                let end = if let Some(to_expr) = &self.to {
                    let to_val = to_expr.evaluate(ctx)?;
                    let to_i = to_val.as_i64().unwrap_or(len);
                    if to_i < 0 {
                        (len + to_i).max(0) as usize
                    } else {
                        to_i.min(len) as usize
                    }
                } else {
                    len as usize
                };
                Ok(Value::Array(arr[start..end.max(start)].to_vec()))
            }
            _ => Ok(Value::Null),
        }
    }
}

/// ["index-of", needle, haystack, from_index?] — returns the index of needle in haystack, or -1.
pub struct IndexOf {
    pub needle: Expr,
    pub haystack: Expr,
    pub from: Option<Expr>,
}

impl Expression for IndexOf {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let needle = self.needle.evaluate(ctx)?;
        let haystack = self.haystack.evaluate(ctx)?;
        let from_i = if let Some(f) = &self.from {
            let fv = f.evaluate(ctx)?;
            fv.as_i64().unwrap_or(0).max(0) as usize
        } else {
            0
        };

        match (&needle, &haystack) {
            (Value::String(n), Value::String(h)) => {
                let result = if from_i < h.len() {
                    // Find in substring, then adjust index
                    let h_chars: Vec<char> = h.chars().collect();
                    let n_chars: Vec<char> = n.chars().collect();
                    let search_from = from_i.min(h_chars.len());
                    let mut found = -1i64;
                    'outer: for i in search_from..=h_chars.len().saturating_sub(n_chars.len()) {
                        if h_chars[i..].starts_with(&n_chars) {
                            found = i as i64;
                            break 'outer;
                        }
                    }
                    found
                } else {
                    -1
                };
                Ok(Value::Number(result.into()))
            }
            (_, Value::Array(arr)) => {
                let from_i = from_i.min(arr.len());
                let result = arr[from_i..]
                    .iter()
                    .position(|item| values_equal(item, &needle))
                    .map(|pos| (pos + from_i) as i64)
                    .unwrap_or(-1);
                Ok(Value::Number(result.into()))
            }
            _ => Ok(Value::Number((-1i64).into())),
        }
    }
}
