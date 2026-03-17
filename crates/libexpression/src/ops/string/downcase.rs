use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use crate::Value;
use super::to_str;

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::ops::literal::Literal;

    #[test]
    fn test_downcase() {
        let props: HashMap<String, Value> = HashMap::new();
        let ctx = EvalContext { feature_id: None, feature_type: "Point", properties: &props };
        let expr = Downcase { value: Box::new(Literal { value: Value::String("HELLO".to_string()) }) };
        assert_eq!(expr.evaluate(&ctx).unwrap(), Value::String("hello".to_string()));
    }
}
