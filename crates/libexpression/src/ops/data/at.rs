use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;

/// ["at", index, array_expr] — returns the element at index from array_expr.
pub struct At {
    pub index: Expr,
    pub array: Expr,
}

impl Expression for At {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let idx = self.index.evaluate(ctx)?;
        let arr = self.array.evaluate(ctx)?;
        let i = match &idx {
            Value::Number(f) => *f as i64,
            _ => return Ok(Value::Null),
        };
        match arr {
            Value::Array(vec) => {
                if i < 0 {
                    let pos = vec.len() as i64 + i;
                    if pos >= 0 {
                        Ok(vec.get(pos as usize).cloned().unwrap_or(Value::Null))
                    } else {
                        Ok(Value::Null)
                    }
                } else {
                    Ok(vec.get(i as usize).cloned().unwrap_or(Value::Null))
                }
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
    fn test_at_positive_index() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let arr = Literal { value: Value::Array(vec![Value::Number(10.0), Value::Number(20.0), Value::Number(30.0)]) };
        let expr = At {
            index: Box::new(Literal { value: Value::Number(1.0) }),
            array: Box::new(arr),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(20.0));
    }

    #[test]
    fn test_at_negative_index() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let arr = Literal { value: Value::Array(vec![Value::Number(10.0), Value::Number(20.0), Value::Number(30.0)]) };
        let expr = At {
            index: Box::new(Literal { value: Value::Number(-1.0) }),
            array: Box::new(arr),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Number(30.0));
    }

    #[test]
    fn test_at_out_of_bounds() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let arr = Literal { value: Value::Array(vec![Value::Number(10.0)]) };
        let expr = At {
            index: Box::new(Literal { value: Value::Number(5.0) }),
            array: Box::new(arr),
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Null);
    }
}
