use geozero::geojson::GeoJsonWriter;
use geozero_shp;
use std::result;

#[derive(Debug)]
pub enum ShapeError {
    Shape(geozero_shp::Error),
    Serialize,
}

impl From<geozero_shp::Error> for ShapeError {
    fn from(err: geozero_shp::Error) -> Self {
        ShapeError::Shape(err)
    }
}

pub type Result<T> = result::Result<T, ShapeError>;

#[derive(Debug)]
pub struct Shapefile {
    pub path: String,
}

impl Shapefile {
    pub fn to_geojson(&self) -> Result<String> {
        let reader = geozero_shp::Reader::from_path(self.path.as_str())?;
        let mut json: Vec<u8> = Vec::new();
        let mut g = GeoJsonWriter::new(&mut json);
        // TODO do this without count
        let _ = reader.iter_features(&mut g)?.count();
        match String::from_utf8(json) {
            Ok(str) => Ok(str),
            Err(_) => Err(ShapeError::Serialize),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_shapefile() {
        let shapefile = Shapefile { path: "./assets/shape-files/ne_10m_populated_places.shp".to_string() };
        assert!(shapefile.to_geojson().is_ok());
    }
}

