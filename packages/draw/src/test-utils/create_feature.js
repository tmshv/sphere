import getGeoJSON from "./get_geojson"

export default function createFeature(featureType) {
    const feature = {
        id: crypto.randomUUID(),
        properties: {},
        ...getGeoJSON(featureType),
    }
    feature.toGeoJSON = () => feature
    feature.setProperty = (property, name) => {
        feature.properties[property] = name
    }
    return feature
}
