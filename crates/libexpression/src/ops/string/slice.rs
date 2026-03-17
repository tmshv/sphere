use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;

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
        let from_i = match &from_val {
            Value::Number(f) => *f as i64,
            _ => 0,
        };

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
                    let to_i = match &to_val {
                        Value::Number(f) => *f as i64,
                        _ => len,
                    };
                    if to_i < 0 {
                        (len + to_i).max(0) as usize
                    } else {
                        to_i.min(len) as usize
                    }
                } else {
                    len as usize
                };
                let result: String = chars[start..end.max(start)].iter().collect();
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
                    let to_i = match &to_val {
                        Value::Number(f) => *f as i64,
                        _ => len,
                    };
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_slice_string() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Slice {
            input: Box::new(Literal { value: Value::String("hello".to_string()) }),
            from: Box::new(Literal { value: Value::Number(1.0) }),
            to: Some(Box::new(Literal { value: Value::Number(3.0) })),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("el".to_string()));
    }

    #[test]
    fn test_slice_to_end() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Slice {
            input: Box::new(Literal { value: Value::String("hello".to_string()) }),
            from: Box::new(Literal { value: Value::Number(2.0) }),
            to: None,
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("llo".to_string()));
    }
}
