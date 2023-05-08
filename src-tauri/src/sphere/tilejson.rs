use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

fn merge(a: &mut Value, b: Value) {
    match (a, b) {
        (a @ &mut Value::Object(_), Value::Object(b)) => {
            let a = a.as_object_mut().unwrap();
            for (k, v) in b {
                merge(a.entry(k).or_insert(Value::Null), v);
            }
        }
        (a, b) => *a = b,
    }
}

pub const MINZOOM: i32 = 0;
pub const MAXZOOM: i32 = 30;

#[derive(Serialize, Deserialize, Debug)]
pub enum TileScheme {
    XYZ,
    TMS,
}

impl TileScheme {
    pub fn from_str(value: &str) -> Option<TileScheme> {
        match value {
            "xyz" => Some(TileScheme::XYZ),
            "tms" => Some(TileScheme::TMS),
            _ => None,
        }
    }
    fn as_str(&self) -> &'static str {
        match self {
            TileScheme::XYZ => "xyz",
            TileScheme::TMS => "tms",
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct VectorLayer {
    pub id: String,
    pub fields: Value,
    pub description: Option<String>,
    pub minzoom: Option<i32>,
    pub maxzoom: Option<i32>,
}

impl VectorLayer {
    pub fn new(id: String, fields: Value) -> VectorLayer {
        VectorLayer {
            id,
            fields,
            description: None,
            minzoom: None,
            maxzoom: None,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Tilejson3 {
    // A semver.org style version number as a string.
    // Describes the version of the TileJSON spec that is implemented by this JSON object.
    pub tilejson: String,

    // An array of tile endpoints.
    // {z}, {x} and {y}, if present, are replaced with the corresponding integers.
    // If multiple endpoints are specified, clients may use any combination of endpoints.
    // All endpoint urls MUST be absolute.
    // All endpoints MUST return the same content for the same URL.
    // The array MUST contain at least one endpoint.
    // The tile extension is NOT limited to any particular format.
    // Some of the more popular are: mvt, vector.pbf, png, webp, and jpg.
    tiles: Vec<String>,

    // An array of objects.
    // Each object describes one layer of vector tile data.
    // A vector_layer object MUST contain the id and fields keys, and MAY contain the description, minzoom, or maxzoom keys.
    // An implemenntation MAY include arbitrary keys in the object outside of those defined in this specification.
    // Note: When describinng a set of raster tiles or other tile format that does not have a "layers" concept (i.e. "format": "jpeg"),
    // the vector_layers key is not required.
    // Note: Will be added on merge step.
    vector_layers: Vec<VectorLayer>,

    // Contains an attribution to be displayed when the map is shown to a user.
    // Implementations MAY decide to treat this as HTML or literal text.
    // For security reasons, make absolutely sure that this content can't be abused as a vector for XSS or beacon tracking.
    pub attribution: Option<String>,

    // The maximum extent of available map tiles.
    // Bounds MUST define an area covered by all zoom levels.
    // The bounds are represented in WGS 84 latitude and longitude values, in the order left, bottom, right, top.
    // Values may be integers or floating point numbers.
    // The minimum/maximum values for longitude and latitude are -180/180 and -90/90 respectively.
    // Bounds MUST NOT "wrap" around the ante-meridian.
    // If bounds are not present, the default value MAY assume the set of tiles is globally distributed.
    // Default: [ -180, -85.05112877980659, 180, 85.0511287798066 ] (xyz-compliant tile bounds)
    pub bounds: Option<Vec<f32>>,

    // The first value is the longitude, the second is latitude (both in WGS:84 values), the third value is the zoom level as an integer.
    // Longitude and latitude MUST be within the specified bounds.
    // The zoom level MUST be between minzoom and maxzoom.
    // Implementations MAY use this center value to set the default location.
    // If the value is null, implementations MAY use their own algorithm for determining a default location.
    pub center: Option<Vec<f32>>,

    // TODO Not implemented
    // An array of data files in GeoJSON format.
    // {z}, {x} and {y}, if present, are replaced with the corresponding integers.
    // If multiple endpoints are specified, clients may use any combination of endpoints.
    // All endpoints MUST return the same content for the same URL.
    // If the array doesn't contain any entries, then no data is present in the map.
    // This field is for overlaying GeoJSON data on tiled raster maps and is generally no longer used for GL-based maps.
    // "data": vec![],

    // A text description of the set of tiles.
    // The description can contain any valid unicode character as described by the JSON specification RFC 8259
    // (https://tools.ietf.org/html/rfc8259).
    pub description: Option<String>,

    // TODO Not implemented
    // An integer specifying the zoom level from which to generate overzoomed tiles.
    // Implementations MAY generate overzoomed tiles from parent tiles if the requested zoom level does not exist.
    // In most cases, overzoomed tiles are generated from the maximum zoom level of the set of tiles.
    // If fillzoom is specified, the overzoomed tile MAY be generated from the fillzoom level.
    // For example, in a set of tiles with maxzoom 10 and no fillzoom specified,
    // a request for a z11 tile will use the z10 parent tiles to generate the new, overzoomed z11 tile.
    // If the same TileJSON object had fillzoom specified at z7, a request for a z11 tile would use the z7 tile instead of z10.
    // While TileJSON may specify rules for overzooming tiles,
    // it is ultimately up to the tile serving client or renderer to implement overzooming.
    // "fillzoom": 0,

    // TODO Not implemented
    // An array of interactivity endpoints.
    // {z}, {x} and {y}, if present, are replaced with the corresponding integers.
    // If multiple endpoints are specified, clients may use any combination of endpoints.
    // All endpoints MUST return the same content for the same URL.
    // If the array doesn't contain any entries, UTF-Grid interactivity is not supported for this set of tiles.
    // See https://github.com/mapbox/utfgrid-spec/tree/master/1.2 for the interactivity specification.
    // Note: UTF-Grid interactivity predates GL-based map rendering and interaction.
    // Map interactivity is now generally defined outside of the TileJSON specification and is dependent on the tile rendering library's features.
    // "grids": []

    // Contains a legend to be displayed with the map.
    // Implementations MAY decide to treat this as HTML or literal text.
    // For security reasons, make absolutely sure that this field can't be abused as a vector for XSS or beacon tracking.
    pub legend: Option<String>,

    // TODO Add checks according to this spec
    // An integer specifying the maximum zoom level.
    // MUST be in range: 0 <= minzoom <= maxzoom <= 30.
    // A client or server MAY request tiles outside of the zoom range,
    // but the availability of these tiles is dependent on how the the tile server or renderer handles the request (such as overzooming tiles).
    pub maxzoom: i32,

    // TODO Add checks according to this spec
    // An integer specifying the minimum zoom level.
    // MUST be in range: 0 <= minzoom <= maxzoom <= 30.
    pub minzoom: i32,

    // A name describing the set of tiles.
    // The name can contain any legal character.
    // Implementations SHOULD NOT interpret the name as HTML.
    pub name: Option<String>,

    // Either "xyz" or "tms".
    // Influences the y direction of the tile coordinates.
    // The global-mercator (aka Spherical Mercator) profile is assumed.
    pub scheme: TileScheme,

    // Contains a mustache template to be used to format data from grids for interaction.
    // See https://github.com/mapbox/utfgrid-spec/tree/master/1.2 for the interactivity specification.
    // Example: "{{#__teaser__}}{{NAME}}{{/__teaser__}}"
    pub template: Option<String>,

    // A semver.org style version number of the tiles.
    // When changes across tiles are introduced the minor version MUST change.
    // This may lead to cut off labels.
    // Therefore, implementors can decide to clean their cache when the minor version changes.
    // Changes to the patch level MUST only have changes to tiles that are contained within one tile.
    // When tiles change significantly, such as updating a vector tile layer name, the major version MUST be increased.
    // Implementations MUST NOT use tiles with different major versions.
    pub version: Option<String>,
}

impl Tilejson3 {
    pub fn new() -> Tilejson3 {
        Tilejson3 {
            tilejson: "3.0.0".into(),
            tiles: vec![],
            vector_layers: vec![],
            scheme: TileScheme::XYZ,
            name: None,
            version: None,
            attribution: None,
            description: None,
            legend: None,
            template: None,
            center: None,
            bounds: None,
            minzoom: MINZOOM,
            maxzoom: MAXZOOM,
        }
    }

    pub fn add_tile(&mut self, value: String) -> &Tilejson3 {
        self.tiles.push(value);
        self
    }

    pub fn add_layer(&mut self, value: VectorLayer) -> &Tilejson3 {
        self.vector_layers.push(value);
        self
    }

    pub fn set_name(&mut self, value: String) -> &Tilejson3 {
        self.name = Some(value);
        self
    }

    pub fn set_description(&mut self, value: String) -> &Tilejson3 {
        self.description = Some(value);
        self
    }

    pub fn set_version(&mut self, value: String) -> &Tilejson3 {
        self.version = Some(value);
        self
    }

    pub fn set_attribution(&mut self, value: String) -> &Tilejson3 {
        self.attribution = Some(value);
        self
    }

    pub fn set_template(&mut self, value: String) -> &Tilejson3 {
        self.template = Some(value);
        self
    }

    pub fn set_legend(&mut self, value: String) -> &Tilejson3 {
        self.legend = Some(value);
        self
    }

    pub fn set_center(&mut self, value: Vec<f32>) -> &Tilejson3 {
        self.center = Some(value);
        self
    }

    pub fn set_bounds(&mut self, value: Vec<f32>) -> &Tilejson3 {
        self.bounds = Some(value);
        self
    }

    pub fn set_zoom(&mut self, minzoom: i32, maxzoom: i32) -> &Tilejson3 {
        if minzoom > maxzoom {
            return self;
        }
        if minzoom < MINZOOM || minzoom > MAXZOOM {
            return self;
        }
        if maxzoom < MINZOOM || maxzoom > MAXZOOM {
            return self;
        }
        self.minzoom = minzoom;
        self.maxzoom = maxzoom;
        self
    }

    pub fn as_json(&self) -> Value {
        json!({
            "tilejson": self.tilejson,
            "tiles": self.tiles,
            "attribution": self.attribution,
            "bounds": self.bounds,
            "center": self.center,
            // "data": vec![],
            "description": self.description,
            // "fillzoom": 0,
            // "grids": []
            "legend": self.legend,
            "maxzoom": self.maxzoom,
            "minzoom": self.minzoom,
            "name": self.name,
            "scheme": self.scheme.as_str(),
            "template": self.template,
            "version": self.version,
            "vector_layers": self.vector_layers,
        })
    }
}
