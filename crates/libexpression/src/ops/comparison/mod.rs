mod eq;
mod ne;
mod lt;
mod lte;
mod gt;
mod gte;

pub use eq::Eq;
pub use ne::Ne;
pub use lt::Lt;
pub use lte::Lte;
pub use gt::Gt;
pub use gte::Gte;

use crate::Value;
use std::cmp::Ordering;

pub(super) fn compare_values(a: &Value, b: &Value) -> Option<Ordering> {
    match (a, b) {
        (Value::Number(x), Value::Number(y)) => x.partial_cmp(y),
        (Value::String(x), Value::String(y)) => Some(x.cmp(y)),
        _ => None,
    }
}
