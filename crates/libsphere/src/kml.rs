use ::geojson::{Feature, FeatureCollection, GeoJson, Value};
use ::kml::types::Element;
use ::kml::types::Geometry as KmlGeometry;
use ::kml::types::Placemark;
use ::kml::KmlReader;
use geo::{
    BoundingRect, Geometry, GeometryCollection, LineString, MultiLineString, MultiPoint,
    MultiPolygon, Point, Polygon,
};
use quick_xml::events::{BytesRef, Event as XmlEvent};
use quick_xml::Reader as XmlReader;
use quick_xml::Writer as XmlWriter;
use serde_json::Map;
use std::collections::HashMap;
use std::io::{Cursor, Read};
use zip::result::ZipError;
use zip::ZipArchive;

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

/// Fewest coordinates a LineString needs to be drawn.
const MIN_LINE_STRING_COORDS: usize = 2;
/// Fewest coordinates a closed Polygon outer ring needs to enclose an area.
const MIN_RING_COORDS: usize = 4;

/// Whether a geometry has enough coordinates for its type to be drawn. A Point
/// always has its one coordinate here: the pre-pass drops empty Points.
fn is_drawable(geometry: &Geometry<f64>) -> bool {
    match geometry {
        Geometry::LineString(line) => line.0.len() >= MIN_LINE_STRING_COORDS,
        Geometry::Polygon(polygon) => polygon.exterior().0.len() >= MIN_RING_COORDS,
        _ => true,
    }
}

/// Convert to a drawable geometry. Degenerate geometries (and MultiGeometry
/// members) become `None`, so their Placemark counts as skipped.
fn to_geo(geometry: KmlGeometry<f64>) -> Option<Geometry<f64>> {
    match geometry {
        KmlGeometry::MultiGeometry(multi) => {
            let members: Vec<Geometry<f64>> =
                multi.geometries.into_iter().filter_map(to_geo).collect();
            collapse(members)
        }
        KmlGeometry::Element(_) => None,
        other => Geometry::try_from(other).ok().filter(is_drawable),
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

/// Error detail for files that are not UTF-8 (UTF-16 or legacy code pages).
const NOT_UTF8: &str = "KML file is not valid UTF-8";

/// Local file header signature that every zip archive, and so every KMZ, starts with.
const ZIP_SIGNATURE: &[u8] = b"PK\x03\x04";
/// Error detail for a KMZ archive that holds no KML document.
const NO_KML_IN_KMZ: &str = "KMZ archive contains no .kml file";

/// The first `.kml` entry of a KMZ archive, which Google Earth reads as the
/// document. Other entries (icons, overlay images) are not used.
fn unzip_document(bytes: Vec<u8>) -> std::result::Result<Vec<u8>, String> {
    let invalid = |e: ZipError| format!("invalid KMZ archive: {e}");
    let mut archive = ZipArchive::new(Cursor::new(bytes)).map_err(invalid)?;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(invalid)?;
        let is_kml = entry
            .name()
            .map_err(invalid)?
            .to_lowercase()
            .ends_with(".kml");
        if !entry.is_file() || !is_kml {
            continue;
        }
        let mut document = Vec::new();
        entry
            .read_to_end(&mut document)
            .map_err(|e| invalid(e.into()))?;
        return Ok(document);
    }
    Err(NO_KML_IN_KMZ.to_string())
}

/// Geometry elements the pre-pass drops when they carry no coordinates.
const GEOMETRY_ELEMENTS: [&[u8]; 4] = [b"Point", b"LineString", b"LinearRing", b"Polygon"];

/// A geometry element held back until its end tag shows whether it has coordinates.
struct PendingGeometry {
    name: Vec<u8>,
    events: Vec<XmlEvent<'static>>,
    has_coordinates: bool,
}

fn is_geometry(name: &[u8]) -> bool {
    GEOMETRY_ELEMENTS.contains(&name)
}

fn is_altitude_mode(name: &[u8]) -> bool {
    name == b"altitudeMode"
}

/// Whether an entity reference stands for real content rather than whitespace.
fn is_content_ref(reference: &BytesRef) -> bool {
    !matches!(reference.resolve_char_ref(), Ok(Some(c)) if c.is_whitespace())
}

/// Send an event to the innermost held-back geometry, or straight to the output.
fn emit(
    event: XmlEvent<'_>,
    pending: &mut [PendingGeometry],
    writer: &mut XmlWriter<Vec<u8>>,
) -> std::result::Result<(), String> {
    match pending.last_mut() {
        Some(geometry) => {
            geometry.events.push(event.into_owned());
            Ok(())
        }
        None => writer.write_event(event).map_err(|e| e.to_string()),
    }
}

/// Pre-pass run before the kml crate parses anything. It returns the document
/// rewritten so that kml 0.15 can read it safely:
///
/// - kml 0.15 loops forever on truncated XML, so malformed input is rejected.
///   Open elements are tracked because quick-xml only reports mismatched end
///   tags, not a missing one at EOF. The root must be `kml`, so other XML is
///   rejected too.
/// - kml 0.15 panics on a Point without coordinates, so `Point`, `LineString`,
///   `LinearRing` and `Polygon` elements with no or whitespace-only coordinates
///   are dropped. A Polygon goes when no outer ring survives. Their Placemarks
///   end up without geometry and are counted as skipped.
/// - kml 0.15 rejects `gx:altitudeMode` values such as `clampToSeaFloor`, so
///   every `altitudeMode` element is dropped. Altitude is not used anyway.
/// - kml 0.15 stops reading `ExtendedData` values at CDATA, so CDATA sections
///   are re-emitted as escaped text.
fn normalise(text: &str) -> std::result::Result<String, String> {
    let mut reader = XmlReader::from_str(text);
    let mut writer = XmlWriter::new(Vec::new());
    let mut open: Vec<Vec<u8>> = Vec::new();
    let mut pending: Vec<PendingGeometry> = Vec::new();
    let mut skipped_depth: u64 = 0;
    let mut root_checked = false;
    loop {
        let event = reader.read_event().map_err(|e| e.to_string())?;
        if let XmlEvent::Start(ref e) | XmlEvent::Empty(ref e) = event {
            if !root_checked {
                root_checked = true;
                if e.local_name().as_ref() != b"kml" {
                    return Err("root element is not <kml>".to_string());
                }
            }
        }
        if skipped_depth > 0 {
            match event {
                XmlEvent::Start(_) => skipped_depth += 1,
                XmlEvent::End(_) => skipped_depth -= 1,
                XmlEvent::Eof => break,
                _ => {}
            }
            continue;
        }
        // Coordinates text marks the geometry directly around `<coordinates>`.
        let in_coordinates = open.last().map(Vec::as_slice) == Some(&b"coordinates"[..]);
        let coordinates_owner = open.iter().rev().nth(1);
        let mark_coordinates = |pending: &mut [PendingGeometry]| {
            if let Some(geometry) = pending.last_mut() {
                if in_coordinates
                    && geometry.name.as_slice() != b"Polygon"
                    && coordinates_owner == Some(&geometry.name)
                {
                    geometry.has_coordinates = true;
                }
            }
        };
        match event {
            XmlEvent::Start(e) => {
                let name = e.local_name().as_ref().to_vec();
                if is_altitude_mode(&name) {
                    skipped_depth = 1;
                    continue;
                }
                if is_geometry(&name) {
                    pending.push(PendingGeometry {
                        name: name.clone(),
                        events: Vec::new(),
                        has_coordinates: false,
                    });
                }
                open.push(name);
                emit(XmlEvent::Start(e), &mut pending, &mut writer)?;
            }
            XmlEvent::Empty(e) => {
                let name = e.local_name();
                // An empty geometry element has no coordinates at all.
                if is_altitude_mode(name.as_ref()) || is_geometry(name.as_ref()) {
                    continue;
                }
                emit(XmlEvent::Empty(e), &mut pending, &mut writer)?;
            }
            XmlEvent::End(e) => {
                emit(XmlEvent::End(e), &mut pending, &mut writer)?;
                let Some(name) = open.pop() else {
                    continue;
                };
                if !is_geometry(&name) {
                    continue;
                }
                let Some(geometry) = pending.pop() else {
                    continue;
                };
                if !geometry.has_coordinates {
                    continue;
                }
                let is_outer_ring = geometry.name.as_slice() == b"LinearRing"
                    && open.last().map(Vec::as_slice) == Some(&b"outerBoundaryIs"[..]);
                if let Some(parent) = pending.last_mut() {
                    if is_outer_ring && parent.name.as_slice() == b"Polygon" {
                        parent.has_coordinates = true;
                    }
                }
                for held in geometry.events {
                    emit(held, &mut pending, &mut writer)?;
                }
            }
            XmlEvent::Text(t) => {
                if !t.decode().map_err(|e| e.to_string())?.trim().is_empty() {
                    mark_coordinates(&mut pending);
                }
                emit(XmlEvent::Text(t), &mut pending, &mut writer)?;
            }
            XmlEvent::CData(c) => {
                let text = c.escape().map_err(|e| e.to_string())?;
                if !text.decode().map_err(|e| e.to_string())?.trim().is_empty() {
                    mark_coordinates(&mut pending);
                }
                emit(XmlEvent::Text(text), &mut pending, &mut writer)?;
            }
            XmlEvent::GeneralRef(r) => {
                if is_content_ref(&r) {
                    mark_coordinates(&mut pending);
                }
                emit(XmlEvent::GeneralRef(r), &mut pending, &mut writer)?;
            }
            XmlEvent::Eof => break,
            other => emit(other, &mut pending, &mut writer)?,
        }
    }
    if !root_checked {
        return Err("no root element".to_string());
    }
    if !open.is_empty() || skipped_depth > 0 {
        return Err("unexpected end of document: unclosed elements".to_string());
    }
    String::from_utf8(writer.into_inner()).map_err(|e| e.to_string())
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
        // Read bytes so that I/O failures stay `Io` and a bad encoding is
        // reported as a KML problem instead of a misleading I/O error.
        let mut bytes = std::fs::read(&self.path).with_path(&self.path)?;
        // KMZ is told apart by content, not extension, so a mislabelled file still opens.
        if bytes.starts_with(ZIP_SIGNATURE) {
            bytes = unzip_document(bytes).map_err(to_error)?;
        }
        let text = String::from_utf8(bytes).map_err(|_| to_error(NOT_UTF8.to_string()))?;
        let normalised = normalise(&text).map_err(to_error)?;
        // Backstop: the pre-pass removes every input known to panic kml 0.15,
        // but a panic must never unwind through the Tauri command, so any other
        // one becomes an error. This relies on the default `panic = "unwind"`.
        std::panic::catch_unwind(|| KmlReader::<_, f64>::from_string(&normalised).read())
            .map_err(|_| to_error("the KML parser crashed on this file".to_string()))?
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
    /// A real Organic Maps bookmarks export: a Document-level `Schema`, one
    /// Folder of Point placemarks with `SchemaData`, and Cyrillic names.
    const ORGANIC_MAPS: &str = "../../samples/organicmaps-spb.kml";

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
    fn organic_maps_export_loads_every_placemark() {
        let features = load(ORGANIC_MAPS);
        assert_eq!(features.len(), 329);
        assert!(features.iter().all(|f| matches!(value(f), Value::Point(_))));
    }

    #[test]
    fn organic_maps_export_keeps_name_and_schema_data_properties() {
        let features = load(ORGANIC_MAPS);
        let building = by_name(&features, "Building");
        assert_eq!(
            prop(&building, "timestamp").as_deref(),
            Some("2017/04/13 16:20:17+00")
        );
        assert_eq!(prop(&building, "tessellate").as_deref(), Some("-1"));
        assert_eq!(prop(&building, "extrude").as_deref(), Some("0"));
        assert_eq!(prop(&building, "visibility").as_deref(), Some("-1"));
        assert_eq!(value(&building), Value::Point(vec![30.328326, 59.923008]));
        by_name(&features, "Канонерский остров");
    }

    #[test]
    fn organic_maps_export_schema_lists_every_property() {
        let source = Kml {
            path: ORGANIC_MAPS.to_string(),
        };
        let schema = source.get_schema().unwrap();
        let mut columns: Vec<&str> = schema.columns.keys().map(String::as_str).collect();
        columns.sort_unstable();
        assert_eq!(
            columns,
            vec!["extrude", "name", "tessellate", "timestamp", "visibility"]
        );
        assert_eq!(schema.points_count, 329);
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

    fn names(features: &[Feature]) -> Vec<String> {
        features.iter().filter_map(|f| prop(f, "name")).collect()
    }

    fn info_of(path: &str) -> KmlInfo {
        Kml {
            path: path.to_string(),
        }
        .info()
        .unwrap()
    }

    #[test]
    fn placemarks_with_empty_point_coordinates_are_skipped() {
        let path = "./assets/kml/empty-point.kml";
        let features = load(path);
        assert_eq!(names(&features), vec!["Good", "Empty hole"]);
        let info = info_of(path);
        assert_eq!(info.placemarks, 7);
        assert_eq!(info.skipped_placemarks, 5);
    }

    #[test]
    fn empty_inner_rings_are_dropped_and_the_polygon_kept() {
        let features = load("./assets/kml/empty-point.kml");
        match value(&by_name(&features, "Empty hole")) {
            Value::Polygon(rings) => assert_eq!(rings.len(), 1),
            other => panic!("expected Polygon, got {other:?}"),
        }
    }

    #[test]
    fn sea_floor_altitude_modes_are_ignored() {
        let features = load("./assets/kml/sea-floor.kml");
        assert!(matches!(
            value(&by_name(&features, "Seabed route")),
            Value::LineString(_)
        ));
        assert!(matches!(
            value(&by_name(&features, "Reef")),
            Value::Polygon(_)
        ));
    }

    #[test]
    fn cdata_in_extended_data_is_preserved() {
        let features = load("./assets/kml/cdata.kml");
        let rich = by_name(&features, "Rich");
        assert_eq!(prop(&rich, "html").as_deref(), Some("<b>x</b>"));
        assert_eq!(prop(&rich, "mixed").as_deref(), Some("pre x post"));
        assert_eq!(prop(&rich, "simple").as_deref(), Some("<i>y</i>"));
    }

    #[test]
    fn cdata_in_description_is_preserved() {
        let features = load("./assets/kml/cdata.kml");
        let rich = by_name(&features, "Rich");
        assert_eq!(
            prop(&rich, "description").as_deref(),
            Some("<p>Hello & welcome</p>")
        );
    }

    #[test]
    fn one_point_line_string_is_skipped() {
        let path = "./assets/kml/degenerate.kml";
        assert!(!names(&load(path)).contains(&"One-point line".to_string()));
    }

    #[test]
    fn empty_polygons_are_skipped() {
        let path = "./assets/kml/degenerate.kml";
        let found = names(&load(path));
        assert!(!found.contains(&"Empty polygon".to_string()));
        assert!(!found.contains(&"Two-point ring".to_string()));
    }

    #[test]
    fn degenerate_multigeometry_members_are_dropped() {
        let path = "./assets/kml/degenerate.kml";
        let features = load(path);
        assert_eq!(names(&features), vec!["Good", "Partly degenerate"]);
        match value(&by_name(&features, "Partly degenerate")) {
            Value::MultiLineString(lines) => assert_eq!(lines.len(), 1),
            other => panic!("expected MultiLineString, got {other:?}"),
        }
        let info = info_of(path);
        assert_eq!(info.placemarks, 6);
        assert_eq!(info.skipped_placemarks, 4);
    }

    #[test]
    fn to_geo_rejects_a_polygon_without_an_outer_ring() {
        let polygon = KmlGeometry::Polygon(::kml::types::Polygon::default());
        assert!(to_geo(polygon).is_none());
    }

    #[test]
    fn to_geojson_returns_an_error_for_non_utf8_files() {
        let path = std::env::temp_dir().join(format!("sphere-non-utf8-{}.kml", std::process::id()));
        let mut bytes = b"<?xml version=\"1.0\"?><kml><Document><Placemark><name>".to_vec();
        bytes.extend_from_slice(&[0xC0, 0xEF, 0xFF]);
        bytes.extend_from_slice(b"</name></Placemark></Document></kml>");
        std::fs::write(&path, bytes).unwrap();
        let path = path.to_string_lossy().to_string();
        let result = Kml { path: path.clone() }.to_geojson();
        std::fs::remove_file(&path).unwrap();
        match result {
            Err(SphereError::Kml { path: p, detail }) => {
                assert_eq!(p, path);
                assert_eq!(detail, "KML file is not valid UTF-8");
            }
            other => panic!("expected Kml error, got {other:?}"),
        }
    }

    /// `doc.kml` is `sample.kml`; a text file comes before it in the archive and
    /// `files/extra.kml` (a copy of `empty.kml`) comes after it.
    const SAMPLE_KMZ: &str = "./assets/kml/sample.kmz";

    #[test]
    fn kmz_reads_the_first_kml_entry_of_the_archive() {
        assert_eq!(names(&load(SAMPLE_KMZ)), names(&load(SAMPLE)));
    }

    #[test]
    fn kmz_info_matches_the_kml_inside() {
        let info = info_of(SAMPLE_KMZ);
        assert_eq!(info.placemarks, 6);
        assert_eq!(info.folders, 3);
        assert_eq!(info.skipped_placemarks, 1);
    }

    #[test]
    fn kmz_bounds_cover_every_feature() {
        let source = Kml {
            path: SAMPLE_KMZ.to_string(),
        };
        assert_eq!(source.get_bounds(), Some((29.0, 59.0, 32.0, 62.0)));
    }

    fn kml_error(path: &str) -> String {
        match (Kml {
            path: path.to_string(),
        })
        .to_geojson()
        {
            Err(SphereError::Kml { path: p, detail }) => {
                assert_eq!(p, path);
                detail
            }
            other => panic!("expected Kml error, got {other:?}"),
        }
    }

    #[test]
    fn kmz_without_a_kml_entry_is_a_kml_error() {
        assert_eq!(
            kml_error("./assets/kml/no-kml.kmz"),
            "KMZ archive contains no .kml file"
        );
    }

    #[test]
    fn truncated_kmz_is_a_kml_error() {
        let detail = kml_error("./assets/kml/broken.kmz");
        assert!(detail.starts_with("invalid KMZ archive"), "{detail}");
    }

    #[test]
    fn to_geojson_returns_an_error_for_non_kml_xml() {
        let source = Kml {
            path: "./assets/kml/not-kml.xml".to_string(),
        };
        match source.to_geojson() {
            Err(SphereError::Kml { path, .. }) => assert!(path.ends_with("not-kml.xml")),
            other => panic!("expected Kml error, got {other:?}"),
        }
    }
}
