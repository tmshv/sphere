pub mod geojson;
pub mod mbtiles;
pub mod tilejson;
pub mod shape;
pub mod source;

pub trait Bounds {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)>;
}

