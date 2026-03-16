use thiserror::Error;

#[derive(Debug, Error)]
pub enum SphereError {
    #[error("I/O error reading {path}: {source}")]
    Io {
        path: String,
        #[source]
        source: std::io::Error,
    },

    #[error("GeoJSON parse error in {path}: {source}")]
    GeoJson {
        path: String,
        source: geojson::Error,
    },

    #[error("CSV parse error in {path}: {source}")]
    Csv {
        path: String,
        source: csv::Error,
    },

    #[error("Shape error in {path}: {detail}")]
    Shape {
        path: String,
        detail: String,
    },

    #[error("MBTiles error in {path}: {detail}")]
    Mbtiles {
        path: String,
        detail: String,
    },

    #[error("Source not found: {id}")]
    NotFound { id: String },

    #[error("Format does not support this operation: {format}")]
    UnsupportedFormat { format: String },

    #[error("Configuration error: {detail}")]
    Config { detail: String },

    #[error("Expression error: {0}")]
    Expression(#[from] libexpression::ExprError),
}

pub type Result<T> = std::result::Result<T, SphereError>;

/// Attach path context to I/O errors.
pub trait WithPath<T> {
    fn with_path(self, path: &str) -> Result<T>;
}

impl<T> WithPath<T> for std::result::Result<T, std::io::Error> {
    fn with_path(self, path: &str) -> Result<T> {
        self.map_err(|source| SphereError::Io {
            path: path.to_string(),
            source,
        })
    }
}
