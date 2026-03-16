use crate::context::EvalContext;
use crate::error::ExprError;
use crate::expr::{Expr, Expression};
use serde_json::{Number, Value};

fn to_f64(v: &Value) -> Option<f64> {
    match v {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.trim().parse().ok(),
        Value::Bool(b) => Some(if *b { 1.0 } else { 0.0 }),
        _ => None,
    }
}

fn num_val(f: f64) -> Value {
    Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null)
}

/// ["+", ...values] — sum of numeric values.
pub struct Add {
    pub args: Vec<Expr>,
}

impl Expression for Add {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let mut sum = 0.0f64;
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            sum += to_f64(&v).unwrap_or(0.0);
        }
        Ok(num_val(sum))
    }
}

/// ["-", a, b?] — if one arg: negation; if two args: subtraction.
pub struct Sub {
    pub left: Expr,
    pub right: Option<Expr>,
}

impl Expression for Sub {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let lf = to_f64(&l).unwrap_or(0.0);
        if let Some(r_expr) = &self.right {
            let r = r_expr.evaluate(ctx)?;
            let rf = to_f64(&r).unwrap_or(0.0);
            Ok(num_val(lf - rf))
        } else {
            Ok(num_val(-lf))
        }
    }
}

/// ["*", ...values] — product of numeric values.
pub struct Mul {
    pub args: Vec<Expr>,
}

impl Expression for Mul {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let mut product = 1.0f64;
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            product *= to_f64(&v).unwrap_or(0.0);
        }
        Ok(num_val(product))
    }
}

/// ["/", a, b] — division; returns null on divide-by-zero, not a panic.
pub struct Div {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Div {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        let lf = to_f64(&l).unwrap_or(0.0);
        let rf = to_f64(&r).unwrap_or(0.0);
        if rf == 0.0 {
            Ok(Value::Null)
        } else {
            Ok(num_val(lf / rf))
        }
    }
}

/// ["%", a, b] — remainder; returns null on divide-by-zero.
pub struct Mod {
    pub left: Expr,
    pub right: Expr,
}

impl Expression for Mod {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let l = self.left.evaluate(ctx)?;
        let r = self.right.evaluate(ctx)?;
        let lf = to_f64(&l).unwrap_or(0.0);
        let rf = to_f64(&r).unwrap_or(0.0);
        if rf == 0.0 {
            Ok(Value::Null)
        } else {
            Ok(num_val(lf % rf))
        }
    }
}

/// ["^", a, b] — power.
pub struct Pow {
    pub base: Expr,
    pub exp: Expr,
}

impl Expression for Pow {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let b = self.base.evaluate(ctx)?;
        let e = self.exp.evaluate(ctx)?;
        let bf = to_f64(&b).unwrap_or(0.0);
        let ef = to_f64(&e).unwrap_or(0.0);
        Ok(num_val(bf.powf(ef)))
    }
}

macro_rules! unary_math {
    ($name:ident, $method:ident) => {
        pub struct $name {
            pub value: Expr,
        }

        impl Expression for $name {
            fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
                let v = self.value.evaluate(ctx)?;
                match to_f64(&v) {
                    Some(f) => Ok(num_val(f.$method())),
                    None => Ok(Value::Null),
                }
            }
        }
    };
}

unary_math!(Abs, abs);
unary_math!(Ceil, ceil);
unary_math!(Floor, floor);
unary_math!(Round, round);
unary_math!(Sqrt, sqrt);
unary_math!(Ln, ln);
unary_math!(Log2, log2);
unary_math!(Log10, log10);

/// ["acos", value]
pub struct Acos {
    pub value: Expr,
}

impl Expression for Acos {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        match to_f64(&v) {
            Some(f) => Ok(num_val(f.acos())),
            None => Ok(Value::Null),
        }
    }
}

/// ["asin", value]
pub struct Asin {
    pub value: Expr,
}

impl Expression for Asin {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        match to_f64(&v) {
            Some(f) => Ok(num_val(f.asin())),
            None => Ok(Value::Null),
        }
    }
}

/// ["atan", value]
pub struct Atan {
    pub value: Expr,
}

impl Expression for Atan {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        match to_f64(&v) {
            Some(f) => Ok(num_val(f.atan())),
            None => Ok(Value::Null),
        }
    }
}

/// ["cos", value]
pub struct Cos {
    pub value: Expr,
}

impl Expression for Cos {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        match to_f64(&v) {
            Some(f) => Ok(num_val(f.cos())),
            None => Ok(Value::Null),
        }
    }
}

/// ["sin", value]
pub struct Sin {
    pub value: Expr,
}

impl Expression for Sin {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        match to_f64(&v) {
            Some(f) => Ok(num_val(f.sin())),
            None => Ok(Value::Null),
        }
    }
}

/// ["tan", value]
pub struct Tan {
    pub value: Expr,
}

impl Expression for Tan {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let v = self.value.evaluate(ctx)?;
        match to_f64(&v) {
            Some(f) => Ok(num_val(f.tan())),
            None => Ok(Value::Null),
        }
    }
}

/// ["min", ...values] — minimum of numeric values.
pub struct Min {
    pub args: Vec<Expr>,
}

impl Expression for Min {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let mut min: Option<f64> = None;
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if let Some(f) = to_f64(&v) {
                min = Some(min.map(|m: f64| m.min(f)).unwrap_or(f));
            }
        }
        Ok(min.map(num_val).unwrap_or(Value::Null))
    }
}

/// ["max", ...values] — maximum of numeric values.
pub struct Max {
    pub args: Vec<Expr>,
}

impl Expression for Max {
    fn evaluate(&self, ctx: &EvalContext) -> Result<Value, ExprError> {
        let mut max: Option<f64> = None;
        for arg in &self.args {
            let v = arg.evaluate(ctx)?;
            if let Some(f) = to_f64(&v) {
                max = Some(max.map(|m: f64| m.max(f)).unwrap_or(f));
            }
        }
        Ok(max.map(num_val).unwrap_or(Value::Null))
    }
}

/// ["e"] — returns Euler's number.
pub struct MathE;

impl Expression for MathE {
    fn evaluate(&self, _ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(num_val(std::f64::consts::E))
    }
}

/// ["pi"] — returns pi.
pub struct Pi;

impl Expression for Pi {
    fn evaluate(&self, _ctx: &EvalContext) -> Result<Value, ExprError> {
        Ok(num_val(std::f64::consts::PI))
    }
}
