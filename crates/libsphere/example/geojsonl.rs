extern crate libsphere;

use libsphere::{geojsonseq, Bounds};

pub fn main() {
    let g = geojsonseq::GeojsonSeq {
        path: String::from("assets/geojson-files/osm-countries.geojsonl"),
    };
    match g.to_geojson() {
        Ok(data) => {
            println!("{}", data)
        }
        Err(_) => println!("Error"),
    }
    match g.get_schema() {
        Ok(data) => println!("{:?}", data),
        Err(_) => println!("Error"),
    }
    match g.get_bounds() {
        Some(data) => println!("{:?}", data),
        None => println!("None"),
    }
}
