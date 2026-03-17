use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use serde_json::Value;

/// ["get", key] — get a property value by key.
/// ["get", key, object_expr] — get from object produced by object_expr.
pub struct Get {
    pub key: Expr,
    pub object: Option<Expr>,
}

impl Expression for Get {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let key = self.key.evaluate(ctx)?;
        let key_str = match &key {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        };

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

/// ["has", key] — returns true if the key exists in properties.
/// ["has", key, object_expr] — returns true if key exists in the object.
pub struct Has {
    pub key: Expr,
    pub object: Option<Expr>,
}

impl Expression for Has {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let key = self.key.evaluate(ctx)?;
        let key_str = match &key {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        };

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

/// ["id"] — returns the feature's id.
pub struct Id;

impl Expression for Id {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(ctx.feature_id.clone().unwrap_or(Value::Null))
    }
}

/// ["geometry-type"] — returns the feature's geometry type string.
pub struct GeometryType;

impl Expression for GeometryType {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(Value::String(ctx.feature_type.to_string()))
    }
}

/// ["properties"] — returns the entire properties object.
pub struct Properties;

impl Expression for Properties {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(Value::Object(ctx.properties.clone()))
    }
}

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
            Value::Number(n) => n.as_i64().unwrap_or(0),
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

/// ["length", value_expr] — returns the length of string or array.
pub struct Length {
    pub value: Expr,
}

impl Expression for Length {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let val = self.value.evaluate(ctx)?;
        match val {
            Value::String(s) => Ok(Value::Number(s.chars().count().into())),
            Value::Array(a) => Ok(Value::Number(a.len().into())),
            _ => Ok(Value::Null),
        }
    }
}
