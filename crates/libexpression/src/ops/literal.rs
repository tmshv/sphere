use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::Expression;
use crate::Value;

/// Returns the literal value as-is.
pub struct Literal {
    pub value: Value,
}

impl Expression for Literal {
    fn evaluate(&self, _ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(self.value.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn make_result(lit: &Literal) -> Value {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        lit.evaluate(&ctx).unwrap()
    }

    #[test]
    fn test_literal_number() {
        let lit = Literal { value: Value::Number(42.0) };
        assert_eq!(make_result(&lit), Value::Number(42.0));
    }

    #[test]
    fn test_literal_string() {
        let lit = Literal { value: Value::String("hello".to_string()) };
        assert_eq!(make_result(&lit), Value::String("hello".to_string()));
    }

    #[test]
    fn test_literal_bool() {
        let lit = Literal { value: Value::Bool(true) };
        assert_eq!(make_result(&lit), Value::Bool(true));
    }

    #[test]
    fn test_literal_null() {
        let lit = Literal { value: Value::Null };
        assert_eq!(make_result(&lit), Value::Null);
    }
}
