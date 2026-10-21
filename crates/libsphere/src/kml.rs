use ::geojson::{Feature, FeatureCollection, GeoJson, Value};
use ::kml::types::Element;
use ::kml::types::Geometry as KmlGeometry;
use ::kml::types::Placemark;
use ::kml::KmlReader;
use geo::{
    BoundingRect, Geometry, GeometryCollection, LineString, MultiLineString, MultiPoint,
    MultiPolygon, Point, Polygon,
};
use quick_xml::events::Event as XmlEvent;
use quick_xml::Reader as XmlReader;
use serde_json::Map;
use std::collections::HashMap;

use crate::error::{Result, SphereError, WithPath};
use crate::schema::{infer_source_schema, SourceSchema};
use crate::Bounds;

#[derive(Debug)]
pub struct Kml {
    pub path: String,
}

#[derive(Debug, Clone)]
pub struct KmlInfo {
    pub placemarks: u64,
    pub folders: u64,
    pub skipped_placemarks: u64,
}

/// A placemark that has drawable geometry.
struct Drawable {
    properties: Map<String, serde_json::Value>,
    geometry: Geometry<f64>,
}

fn collect(node: ::kml::Kml<f64>, placemarks: &mut Vec<Placemark<f64>>, folders: &mut u64) {
    let elements = match node {
        ::kml::Kml::KmlDocument(d) => d.elements,
        ::kml::Kml::Document { elements, .. } => elements,
        ::kml::Kml::Folder(f) => {
            *folders += 1;
            f.elements
        }
        ::kml::Kml::Placemark(p) => {
            placemarks.push(p);
            return;
        }
        _ => return,
    };
    for element in elements {
        collect(element, placemarks, folders);
    }
}

fn to_geo(geometry: KmlGeometry<f64>) -> Option<Geometry<f64>> {
    match geometry {
        KmlGeometry::MultiGeometry(multi) => {
            let members: Vec<Geometry<f64>> =
                multi.geometries.into_iter().filter_map(to_geo).collect();
            collapse(members)
        }
        KmlGeometry::Element(_) => None,
        other => Geometry::try_from(other).ok(),
    }
}

/// Merge members of one kind into the matching Multi* type; otherwise keep a collection.
fn collapse(members: Vec<Geometry<f64>>) -> Option<Geometry<f64>> {
    if members.is_empty() {
        return None;
    }
    if let Some(points) = members
        .iter()
        .map(|g| Point::<f64>::try_from(g.clone()).ok())
        .collect::<Option<Vec<_>>>()
    {
        return Some(Geometry::MultiPoint(MultiPoint(points)));
    }
    if let Some(lines) = members
        .iter()
        .map(|g| LineString::<f64>::try_from(g.clone()).ok())
        .collect::<Option<Vec<_>>>()
    {
        return Some(Geometry::MultiLineString(MultiLineString(lines)));
    }
    if let Some(polygons) = members
        .iter()
        .map(|g| Polygon::<f64>::try_from(g.clone()).ok())
        .collect::<Option<Vec<_>>>()
    {
        return Some(Geometry::MultiPolygon(MultiPolygon(polygons)));
    }
    Some(Geometry::GeometryCollection(GeometryCollection(members)))
}

fn check_well_formed(text: &str) -> std::result::Result<(), String> {
    let mut reader = XmlReader::from_str(text);
    let mut depth: u64 = 0;
    loop {
        match reader.read_event().map_err(|e| e.to_string())? {
            XmlEvent::Start(_) => depth += 1,
            XmlEvent::End(_) => depth = depth.saturating_sub(1),
            XmlEvent::Eof => break,
            _ => {}
        }
    }
    if depth > 0 {
        return Err("unexpected end of document: unclosed elements".to_string());
    }
    Ok(())
}

fn child<'a>(element: &'a Element, name: &str) -> Option<&'a Element> {
    element.children.iter().find(|c| c.name == name)
}

fn insert_extended(element: &Element, props: &mut Map<String, serde_json::Value>) {
    for entry in &element.children {
        match entry.name.as_str() {
            "Data" => {
                if let (Some(key), Some(value)) = (entry.attrs.get("name"), child(entry, "value")) {
                    props.insert(
                        key.clone(),
                        value.content.clone().unwrap_or_default().into(),
                    );
                }
            }
            "SchemaData" => {
                for simple in entry.children.iter().filter(|c| c.name == "SimpleData") {
                    if let Some(key) = simple.attrs.get("name") {
                        props.insert(
                            key.clone(),
                            simple.content.clone().unwrap_or_default().into(),
                        );
                    }
                }
            }
            _ => {}
        }
    }
}

fn properties(placemark: &Placemark<f64>) -> Map<String, serde_json::Value> {
    let mut props = Map::new();
    for extended in placemark
        .children
        .iter()
        .filter(|c| c.name == "ExtendedData")
    {
        insert_extended(extended, &mut props);
    }
    if let Some(name) = &placemark.name {
        props.insert("name".to_string(), name.clone().into());
    }
    if let Some(description) = &placemark.description {
        props.insert("description".to_string(), description.clone().into());
    }
    props
}

impl Kml {
    fn parse(&self) -> Result<::kml::Kml<f64>> {
        let to_error = |detail: String| SphereError::Kml {
            path: self.path.clone(),
            detail,
        };
        let text = std::fs::read_to_string(&self.path).with_path(&self.path)?;
        // The kml reader loops forever on a truncated document, so check
        // well-formedness first.
        check_well_formed(&text).map_err(to_error)?;
        KmlReader::<_, f64>::from_string(&text)
            .read()
            .map_err(|e| to_error(e.to_string()))
    }

    fn drawables(&self) -> Result<(Vec<Drawable>, KmlInfo)> {
        let mut placemarks = Vec::new();
        let mut folders = 0;
        collect(self.parse()?, &mut placemarks, &mut folders);

        let total = placemarks.len() as u64;
        let drawables: Vec<Drawable> = placemarks
            .into_iter()
            .filter_map(|p| {
                let properties = properties(&p);
                let geometry = p.geometry.and_then(to_geo)?;
                Some(Drawable {
                    properties,
                    geometry,
                })
            })
            .collect();
        let info = KmlInfo {
            placemarks: total,
            folders,
            skipped_placemarks: total - drawables.len() as u64,
        };
        Ok((drawables, info))
    }

    fn features(&self) -> Result<Vec<Feature>> {
        let (drawables, _) = self.drawables()?;
        Ok(drawables
            .into_iter()
            .map(|d| Feature {
                bbox: None,
                geometry: Some(Value::from(&d.geometry).into()),
                id: None,
                properties: Some(d.properties),
                foreign_members: None,
            })
            .collect())
    }

    pub fn info(&self) -> Result<KmlInfo> {
        Ok(self.drawables()?.1)
    }

    pub fn get_schema(&self) -> Result<SourceSchema> {
        let features = self.features()?;
        if features.is_empty() {
            return Ok(SourceSchema {
                columns: HashMap::new(),
                ..Default::default()
            });
        }
        Ok(infer_source_schema(features.iter()))
    }

    pub fn to_geojson(&self) -> Result<String> {
        let collection = FeatureCollection {
            features: self.features()?,
            bbox: None,
            foreign_members: None,
        };
        Ok(GeoJson::FeatureCollection(collection).to_string())
    }
}

impl Bounds for Kml {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)> {
        let (drawables, _) = self.drawables().ok()?;
        let all = GeometryCollection(drawables.into_iter().map(|d| d.geometry).collect());
        let rect = all.bounding_rect()?;
        let (min, max) = (rect.min(), rect.max());
        Some((min.x, min.y, max.x, max.y))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ::geojson::{GeoJson, Value};

    const SAMPLE: &str = "./assets/kml/sample.kml";

    fn load(path: &str) -> Vec<Feature> {
        let source = Kml {
            path: path.to_string(),
        };
        let text = source.to_geojson().unwrap();
        match text.parse::<GeoJson>().unwrap() {
            GeoJson::FeatureCollection(fc) => fc.features,
            _ => panic!("expected FeatureCollection"),
        }
    }

    fn by_name(features: &[Feature], name: &str) -> Feature {
        features
            .iter()
            .find(|f| {
                f.properties
                    .as_ref()
                    .and_then(|p| p.get("name"))
                    .and_then(|v| v.as_str())
                    == Some(name)
            })
            .cloned()
            .unwrap_or_else(|| panic!("no feature named {name}"))
    }

    fn value(feature: &Feature) -> Value {
        feature.geometry.clone().expect("geometry").value
    }

    fn prop(feature: &Feature, key: &str) -> Option<String> {
        feature
            .properties
            .as_ref()
            .and_then(|p| p.get(key))
            .and_then(|v| v.as_str())
            .map(String::from)
    }

    #[test]
    fn to_geojson_emits_one_feature_per_drawable_placemark() {
        assert_eq!(load(SAMPLE).len(), 5);
    }

    #[test]
    fn nested_folder_placemarks_are_included() {
        let features = load(SAMPLE);
        assert!(matches!(
            value(&by_name(&features, "Walk")),
            Value::LineString(_)
        ));
    }

    #[test]
    fn name_description_and_extended_data_become_properties() {
        let features = load(SAMPLE);
        let cafe = by_name(&features, "Cafe");
        assert_eq!(prop(&cafe, "name").as_deref(), Some("Cafe"));
        assert_eq!(prop(&cafe, "description").as_deref(), Some("Nice"));
        assert_eq!(prop(&cafe, "rating").as_deref(), Some("5"));
        let walk = by_name(&features, "Walk");
        assert_eq!(prop(&walk, "km").as_deref(), Some("3.2"));
    }

    #[test]
    fn polygon_keeps_inner_rings() {
        let features = load(SAMPLE);
        match value(&by_name(&features, "Park")) {
            Value::Polygon(rings) => assert_eq!(rings.len(), 2),
            other => panic!("expected Polygon, got {other:?}"),
        }
    }

    #[test]
    fn multigeometry_collapses_homogeneous_members_and_keeps_mixed_as_collection() {
        let features = load(SAMPLE);
        assert!(matches!(
            value(&by_name(&features, "Pair")),
            Value::MultiPoint(_)
        ));
        assert!(matches!(
            value(&by_name(&features, "Mixed")),
            Value::GeometryCollection(_)
        ));
    }

    #[test]
    fn altitude_is_dropped() {
        let features = load(SAMPLE);
        match value(&by_name(&features, "Cafe")) {
            Value::Point(c) => assert_eq!(c, vec![30.1, 59.9]),
            other => panic!("expected Point, got {other:?}"),
        }
    }

    #[test]
    fn info_counts_placemarks_folders_and_skipped() {
        let info = Kml {
            path: SAMPLE.to_string(),
        }
        .info()
        .unwrap();
        assert_eq!(info.placemarks, 6);
        assert_eq!(info.folders, 3);
        assert_eq!(info.skipped_placemarks, 1);
    }

    #[test]
    fn get_bounds_covers_every_feature() {
        let source = Kml {
            path: SAMPLE.to_string(),
        };
        assert_eq!(source.get_bounds(), Some((29.0, 59.0, 32.0, 62.0)));
    }

    #[test]
    fn get_bounds_is_none_when_nothing_is_drawable() {
        let path = "./assets/kml/empty.kml";
        let source = Kml {
            path: path.to_string(),
        };
        assert_eq!(source.get_bounds(), None);
        assert_eq!(load(path).len(), 0);
    }

    #[test]
    fn to_geojson_returns_an_error_for_malformed_xml() {
        let source = Kml {
            path: "./assets/kml/broken.kml".to_string(),
        };
        match source.to_geojson() {
            Err(SphereError::Kml { path, .. }) => assert!(path.ends_with("broken.kml")),
            other => panic!("expected Kml error, got {other:?}"),
        }
    }
}
