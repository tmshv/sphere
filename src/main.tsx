import React from "react";
import ReactDOM from "react-dom/client";
import { MapProvider } from "react-map-gl";
import App from "./App";
import "./style.css";
import "mapbox-gl/dist/mapbox-gl.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MapProvider>
      <App />
    </MapProvider>
  </React.StrictMode>
);
