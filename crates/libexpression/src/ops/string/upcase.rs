use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::to_str;

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_upcase() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Upcase { value: Box::new(Literal { value: Value::String("hello".to_string()) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("HELLO".to_string()));
    }
}
