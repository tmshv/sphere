#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESOURCES_DIR="$SCRIPT_DIR/Resources"
BUILD_DIR="$SCRIPT_DIR/.build"
APPEX_NAME="SphereQuickLook.appex"
APPEX_PATH="$BUILD_DIR/$APPEX_NAME"

# Copy MapLibre assets into Resources
MAPLIBRE_DIST="$REPO_ROOT/node_modules/maplibre-gl/dist"
echo "Copying MapLibre GL assets..."
cp "$MAPLIBRE_DIST/maplibre-gl.js"  "$RESOURCES_DIR/maplibre-gl.js"
cp "$MAPLIBRE_DIST/maplibre-gl.css" "$RESOURCES_DIR/maplibre-gl.css"

# Create bundle structure
echo "Creating .appex bundle..."
rm -rf "$APPEX_PATH"
mkdir -p "$APPEX_PATH/Contents/MacOS"
mkdir -p "$APPEX_PATH/Contents/Resources"

# Compile Swift source
echo "Compiling PreviewViewController.swift..."
swiftc \
    -module-name SphereQuickLook \
    -parse-as-library \
    -target arm64-apple-macos12.0 \
    -framework Cocoa \
    -framework WebKit \
    -framework Quartz \
    -Xlinker -bundle \
    -o "$APPEX_PATH/Contents/MacOS/SphereQuickLook" \
    "$SCRIPT_DIR/PreviewViewController.swift"

# Copy plist and resources
cp "$SCRIPT_DIR/Info.plist" "$APPEX_PATH/Contents/Info.plist"
cp "$RESOURCES_DIR/index.html"      "$APPEX_PATH/Contents/Resources/index.html"
cp "$RESOURCES_DIR/maplibre-gl.js"  "$APPEX_PATH/Contents/Resources/maplibre-gl.js"
cp "$RESOURCES_DIR/maplibre-gl.css" "$APPEX_PATH/Contents/Resources/maplibre-gl.css"

# Ad-hoc sign with entitlements
echo "Signing $APPEX_NAME..."
codesign \
    --force \
    --sign - \
    --entitlements "$SCRIPT_DIR/SphereQuickLook.entitlements" \
    "$APPEX_PATH"

# Install into the Tauri app bundle
APP_BUNDLE="$REPO_ROOT/src-tauri/target/release/bundle/macos/Sphere.app"
PLUGINS_DIR="$APP_BUNDLE/Contents/PlugIns"

if [ -d "$APP_BUNDLE" ]; then
    echo "Installing into $PLUGINS_DIR..."
    mkdir -p "$PLUGINS_DIR"
    rm -rf "$PLUGINS_DIR/$APPEX_NAME"
    cp -R "$APPEX_PATH" "$PLUGINS_DIR/$APPEX_NAME"
    echo "Installed: $PLUGINS_DIR/$APPEX_NAME"
else
    echo "Warning: Sphere.app not found at $APP_BUNDLE"
    echo "Run 'npm run tauri build' first, then re-run this script."
    echo "Built .appex is at: $APPEX_PATH"
fi

echo "Done."
