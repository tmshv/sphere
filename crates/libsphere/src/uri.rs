use std::fmt;
use url::Url;

#[derive(Debug, Clone)]
pub struct SphereUri(Url);

#[derive(Debug)]
pub struct UriError(String);

impl fmt::Display for UriError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SphereUri parse error: {}", self.0)
    }
}

impl std::error::Error for UriError {}

impl SphereUri {
    pub fn parse(s: &str) -> Result<Self, UriError> {
        Url::parse(s)
            .map(SphereUri)
            .map_err(|e| UriError(e.to_string()))
    }

    pub fn as_url(&self) -> &Url {
        &self.0
    }

    fn query_param(&self, key: &str) -> Option<String> {
        self.0
            .query_pairs()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.into_owned())
    }

    pub fn x_field(&self) -> Option<String> {
        self.query_param("x")
    }

    pub fn y_field(&self) -> Option<String> {
        self.query_param("y")
    }

    pub fn wkt_field(&self) -> Option<String> {
        self.query_param("wkt")
    }

}

impl fmt::Display for SphereUri {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_csv_uri_with_all_params() {
        let s = "file:///data/points.csv?x=longitude&y=latitude&wkt=geom";
        let uri = SphereUri::parse(s).expect("should parse");
        assert_eq!(uri.x_field(), Some("longitude".to_string()));
        assert_eq!(uri.y_field(), Some("latitude".to_string()));
        assert_eq!(uri.wkt_field(), Some("geom".to_string()));
    }

    #[test]
    fn test_parse_geojson_uri_accessors_return_none() {
        let s = "file:///data/layer.geojson";
        let uri = SphereUri::parse(s).expect("should parse");
        assert_eq!(uri.x_field(), None);
        assert_eq!(uri.y_field(), None);
        assert_eq!(uri.wkt_field(), None);
    }

    #[test]
    fn test_display_round_trips() {
        let s = "file:///data/points.csv?x=lng&y=lat";
        let uri = SphereUri::parse(s).expect("should parse");
        assert_eq!(uri.to_string(), s);
    }

    #[test]
    fn test_invalid_uri_returns_err() {
        let result = SphereUri::parse("not a valid uri %%%");
        assert!(result.is_err());
    }
}
