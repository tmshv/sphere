mod concat;
mod downcase;
mod upcase;
mod slice;
mod index_of;

pub use concat::Concat;
pub use downcase::Downcase;
pub use upcase::Upcase;
pub use slice::Slice;
pub use index_of::IndexOf;

use crate::Value;

pub(super) fn to_str(v: Value) -> String {
    match v {
        Value::String(s) => s,
        Value::Null => String::new(),
        Value::Bool(b) => b.to_string(),
        Value::Number(f) => f.to_string(),
        other => format!("{:?}", other),
    }
}
