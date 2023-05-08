use geojson::{
    Feature, FeatureCollection, GeoJson, Geometry, JsonObject, JsonValue, Position, Value,
};
use shapefile::dbase::FieldValue;

pub fn to_geojson(path: &str) -> Result<String, String> {
    // let mut reader = shapefile::Reader::from_path(path).unwrap();
    // for result in reader.iter_shapes_and_records() {
    //     let (shape, record) = result.unwrap();
    //     println!("Shape: {}, records: ", shape);
    //     for (name, value) in record {
    //         println!("\t{}: {:?}, ", name, value);
    //     }
    //     println!();
    // }

    let geometry = Geometry::new(Value::Point(vec![-120.66029, 35.2812]));
    let mut properties = JsonObject::new();
    properties.insert(String::from("name"), JsonValue::from("Firestone Grill"));

    let mut features: Vec<Feature> = vec![];
    let polygons =
        shapefile::read_as::<_, shapefile::Polygon, shapefile::dbase::Record>(path).unwrap();
    // let points = shapefile::read_as::<_, shapefile::Point, shapefile::dbase::Record>(
    //     "./tests/data/points.shp",
    // )
    // .expect("Could not open point shapefiles");
    for (polygon, polygon_record) in polygons {
        let rings: Vec<Vec<Position>> = polygon
            .rings()
            .into_iter()
            .map(|ring| {
                let pts: Vec<Position> = ring
                    .points()
                    .into_iter()
                    .map(|point| {
                        let pos: Position = vec![point.x, point.y];
                        pos
                    })
                    .collect();
                pts
            })
            .collect();
        let geometry = Geometry::new(Value::Polygon(rings));

        let mut properties = JsonObject::new();
        polygon_record.into_iter().for_each(|field| {
            let (key, value) = field;
            match value {
                FieldValue::Character(value) => {
                    properties.insert(key, JsonValue::from(value));
                }
                FieldValue::Numeric(value) => {
                    properties.insert(key, JsonValue::from(value));
                }
                FieldValue::Integer(value) => {
                    properties.insert(key, JsonValue::from(value));
                }
                FieldValue::Float(value) => {
                    properties.insert(key, JsonValue::from(value));
                }
                FieldValue::Double(value) => {
                    properties.insert(key, JsonValue::from(value));
                }
                FieldValue::Logical(value) => {
                    properties.insert(key, JsonValue::from(value));
                }
                // Date(Option<Date>),
                // Visual FoxPro fields
                // Currency(f64),
                // DateTime(DateTime),
                // Memo(String),
                _ => {}
            }
        });

        let feature = Feature {
            bbox: None,
            geometry: Some(geometry),
            id: None,
            properties: Some(properties),
            foreign_members: None,
        };
        features.push(feature);

        // println!("{:?}", polygon.bbox());
        // println!("{:?}", polygon_record);
        // let geo_polygon: geo::MultiPolygon<f64> = polygon.into();
        // for (point, point_record) in points.iter() {
        //     let geo_point: geo::Point<f64> = point.clone().into();
        //     if geo_polygon.contains(&geo_point) {
        //         let point_id = match point_record.get("id") {
        //             Some(dbase::FieldValue::Numeric(Some(x))) => x,
        //             Some(_) => panic!("Expected 'id' to be a numeric in point-dataset"),
        //             None => panic!("Field 'id' is not within point-dataset"),
        //         };
        //         let polygon_id = match polygon_record.get("id") {
        //             Some(dbase::FieldValue::Numeric(Some(x))) => x,
        //             Some(_) => panic!("Expected 'id' to be a numeric in polygon-dataset"),
        //             None => panic!("Field 'id' is not within polygon-dataset"),
        //         };
        //         println!(
        //             "Point with id {} is within polygon with id {}",
        //             point_id, polygon_id
        //         );
        //     }
        // }
    }
    // Create a feature collection from the features
    let feature_collection = FeatureCollection {
        bbox: None,
        features,
        foreign_members: None,
    };
    Ok(feature_collection.to_string())
}

