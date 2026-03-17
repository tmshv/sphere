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

/// ["has", key] — returns true if the key exists in properties.
/// ["has", key, object_expr] — returns true if key exists in the object.
pub struct Has {
    pub key: Expr,
    pub object: Option<Expr>,
}

impl Expression for Has {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let key = self.key.evaluate(ctx)?;
        let key_str = value_to_key_string(&key);

        let exists = if let Some(obj_expr) = &self.object {
            let obj = obj_expr.evaluate(ctx)?;
            match obj {
                Value::Object(map) => map.contains_key(&key_str),
                _ => false,
            }
        } else {
            ctx.properties.contains_key(&key_str)
        };

        Ok(Value::Bool(exists))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_has_existing_key() {
        let mut props = HashMap::new();
        props.insert("name".to_string(), Value::String("Paris".to_string()));
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Has {
            key: Box::new(Literal { value: Value::String("name".to_string()) }),
            object: None,
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(true));
    }

    #[test]
    fn test_has_missing_key() {
        let props = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Has {
            key: Box::new(Literal { value: Value::String("foo".to_string()) }),
            object: None,
        };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::Bool(false));
    }
}
