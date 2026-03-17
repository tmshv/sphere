use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;

fn value_to_key_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(f) => f.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".to_string(),
        _ => String::new(),
    }
}

/// ["get", key] — get a property value by key.
/// ["get", key, object_expr] — get from object produced by object_expr.
pub struct Get {
    pub key: Expr,
    pub object: Option<Expr>,
}

impl Expression for Get {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let key = self.key.evaluate(ctx)?;
        let key_str = value_to_key_string(&key);

        if let Some(obj_expr) = &self.object {
            let obj = obj_expr.evaluate(ctx)?;
            match obj {
                Value::Object(map) => Ok(map.get(&key_str).cloned().unwrap_or(Value::Null)),
                _ => Ok(Value::Null),
            }
        } else {
            Ok(ctx.properties.get(&key_str).cloned().unwrap_or(Value::Null))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_get_from_properties() {
        let mut props = HashMap::new();
        props.insert("name".to_string(), Value::String("Paris".to_string()));
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Get {
            key: Box::new(Literal { value: Value::String("name".to_string()) }),
            object: None,
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("Paris".to_string()));
    }

    #[test]
    fn test_get_missing_key() {
        let props = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Get {
            key: Box::new(Literal { value: Value::String("foo".to_string()) }),
            object: None,
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Null);
    }
}
