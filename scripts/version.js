import { readFileSync, writeFileSync } from "fs"

const version = process.env.npm_package_version

// Update tauri.conf.json
const tauriConfigPath = "src-tauri/tauri.conf.json"
let tauriConfig = readFileSync(tauriConfigPath, "utf8")
tauriConfig = tauriConfig.replace(/"version": ".*"/, `"version": "${version}"`)
writeFileSync(tauriConfigPath, tauriConfig)

// Update Cargo.toml
const cargoPath = "src-tauri/Cargo.toml"
let cargo = readFileSync(cargoPath, "utf8")
cargo = cargo.replace(/^version = ".*"$/m, `version = "${version}"`)
writeFileSync(cargoPath, cargo)

console.log(`Synced version ${version} to tauri.conf.json and Cargo.toml`)
