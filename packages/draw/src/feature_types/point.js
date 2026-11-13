import Feature from "./feature"

const Point = function (ctx, geojson) {
    Feature.call(this, ctx, geojson)
}

Point.prototype = Object.create(Feature.prototype)

Point.prototype.isValid = function () {
    return typeof this.coordinates[0] === "number" && typeof this.coordinates[1] === "number"
}

Point.prototype.updateCoordinate = function (...args) {
    // Called as (lng, lat) or, like other features, as (path, lng, lat)
    this.coordinates = args.length === 3 ? args.slice(1) : args.slice(0, 2)
    this.changed()
}

Point.prototype.getCoordinate = function () {
    return this.getCoordinates()
}

export default Point
