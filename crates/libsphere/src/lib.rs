pub mod csv;
pub mod error;
pub mod geojson;
pub mod geojsonseq;
pub mod gpx;
pub mod mbtiles;
pub mod schema;
pub mod shape;
pub mod source;
pub mod uri;

pub use error::{Result, SphereError};
pub use uri::SphereUri;

pub trait Bounds {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)>;
}
