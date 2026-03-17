mod add;
mod sub;
mod mul;
mod div;
mod rem;
mod pow;
mod min;
mod max;
mod e;
mod pi;
mod abs;
mod ceil;
mod floor;
mod round;
mod sqrt;
mod ln;
mod log2;
mod log10;
mod acos;
mod asin;
mod atan;
mod cos;
mod sin;
mod tan;

pub use add::Add;
pub use sub::Sub;
pub use mul::Mul;
pub use div::Div;
pub use rem::Mod;
pub use pow::Pow;
pub use min::Min;
pub use max::Max;
pub use e::MathE;
pub use pi::Pi;
pub use abs::Abs;
pub use ceil::Ceil;
pub use floor::Floor;
pub use round::Round;
pub use sqrt::Sqrt;
pub use ln::Ln;
pub use log2::Log2;
pub use log10::Log10;
pub use acos::Acos;
pub use asin::Asin;
pub use atan::Atan;
pub use cos::Cos;
pub use sin::Sin;
pub use tan::Tan;

use crate::Value;

pub(super) fn to_f64(v: &Value) -> Option<f64> {
    match v {
        Value::Number(f) => Some(*f),
        Value::String(s) => s.trim().parse().ok(),
        Value::Bool(b) => Some(if *b { 1.0 } else { 0.0 }),
        _ => None,
    }
}

pub(super) fn num_val(f: f64) -> Value {
    if f.is_finite() {
        Value::Number(f)
    } else {
        Value::Null
    }
}
