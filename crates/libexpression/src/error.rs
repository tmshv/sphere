use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum ExprError {
    UnknownOperator(String),
    InvalidExpression(String),
    TypeMismatch { expected: String, got: String },
    ArityMismatch { operator: String, expected: String, got: usize },
    EvalError(String),
}

impl fmt::Display for ExprError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ExprError::UnknownOperator(op) => write!(f, "Unknown operator: {}", op),
            ExprError::InvalidExpression(msg) => write!(f, "Invalid expression: {}", msg),
            ExprError::TypeMismatch { expected, got } => {
                write!(f, "Type mismatch: expected {}, got {}", expected, got)
            }
            ExprError::ArityMismatch { operator, expected, got } => {
                write!(
                    f,
                    "Arity mismatch for {}: expected {}, got {}",
                    operator, expected, got
                )
            }
            ExprError::EvalError(msg) => write!(f, "Evaluation error: {}", msg),
        }
    }
}

impl std::error::Error for ExprError {}
