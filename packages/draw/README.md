> Vendored into Sphere as `@sphere/draw` from [hyvilo/maplibre-gl-draw](https://github.com/hyvilo/maplibre-gl-draw) at commit `db8b7f0` (published as `@hyvilo/maplibre-gl-draw@1.0.0`). `maplibre-gl-draw.css` comes from upstream `dist/`; the source has since been converted to TypeScript.

# @hyvilo/maplibre-gl-draw


Adds support for drawing and editing features on [maplibre-gl.js](https://maplibre.org/projects/maplibre-gl-js/) maps. [See a live example here](https://maplibre.org/maplibre-gl-js-docs/example/mapbox-gl-draw/)


### Installing

```
npm install @hyvilo/maplibre-gl-draw
```

Draw ships with CSS, make sure you include it in your build.

### Usage in your application

#### JavaScript

**When using modules**

```js
import maplibregl from 'maplibre-gl';
import MapLibreDraw from "@mapbox/mapbox-gl-draw";
```

**When using a CDN**

```html
<script src='https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.1/mapbox-gl-draw.js'></script>
```

#### CSS

 ```js
import '@hyvilo/maplibre-gl-draw/dist/maplibre-gl-draw.css'
 ```

### Typescript

Typescript definition files are available

### Example usage

```js
maplibregl.accessToken = 'YOUR_ACCESS_TOKEN';

var map = new maplibregl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [40, -74.50],
  zoom: 9
});

var Draw = new MapLibreDraw();

// Map#addControl takes an optional second argument to set the position of the control.
// If no position is specified the control defaults to `top-right`. See the docs
// for more details: https://docs.mapbox.com/mapbox-gl-js/api/#map#addcontrol

map.addControl(Draw, 'top-left');

map.on('load', function() {
  // ALL YOUR APPLICATION CODE
});
```


### Developing and testing

Install dependencies, build the source files and crank up a server via:

```
git clone git@github.com:mapbox/mapbox-gl-draw.git
yarn install
yarn start
```

### Testing

```
npm run test
```

### Publishing

To GitHub and NPM:

```
npm version (major|minor|patch)
git push --tags
git push
npm publish
```

To CDN:

```
# make sure you are authenticated for AWS
git checkout v{x.y.z}
yarn install
yarn run prepublish
aws s3 cp --recursive --acl public-read dist s3://mapbox-gl-js/plugins/mapbox-gl-draw/v{x.y.z}
```

Update the version number in [the GL JS example](https://github.com/mapbox/mapbox-gl-js/blob/publisher-production/docs/pages/example/mapbox-gl-draw.html).

### Naming actions

We're trying to follow standards when naming things. Here is a collection of links where we look for inspiration.

- https://turfjs.org
- https://shapely.readthedocs.io/en/latest/manual.html
