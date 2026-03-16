use serde_json::{Map, Value};

/// Evaluation context for an expression, representing a single GeoJSON feature.
pub struct EvalContext<'a> {
    /// The feature's `id` field, if any.
    pub feature_id: Option<Value>,
    /// The geometry type string: "Point", "LineString", "Polygon", "MultiPoint",
    /// "MultiLineString", "MultiPolygon", "GeometryCollection", or "Unknown".
    pub feature_type: &'a str,
    /// The feature's `properties` map.
    pub properties: &'a Map<String, Value>,
}
