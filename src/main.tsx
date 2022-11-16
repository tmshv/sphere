import React from "react";
import ReactDOM from "react-dom/client";
import { MapProvider } from "react-map-gl";
import App from "./App";
import "./style.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { MantineProvider } from "@mantine/core";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider withGlobalStyles withNormalizeCSS theme={{
      fontFamily: "monospace",
      spacing: {
        xs: 4,
      }
    }}>
      <MapProvider>
        <App />
      </MapProvider>
    </MantineProvider>
  </React.StrictMode>
);
