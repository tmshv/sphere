pub mod csv;
pub mod geojson;
pub mod geojsonseq;
pub mod gpx;
pub mod mbtiles;
pub mod shape;
pub mod source;

pub trait Bounds {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)>;
}
