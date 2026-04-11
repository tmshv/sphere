import { readFileSync, writeFileSync } from "fs"
import { execSync } from "child_process"

const version = process.env.npm_package_version

// Update tauri.conf.json
const tauriConfigPath = "../../src-tauri/tauri.conf.json"
let tauriConfig = readFileSync(tauriConfigPath, "utf8")
tauriConfig = tauriConfig.replace(/"version": ".*"/, `"version": "${version}"`)
writeFileSync(tauriConfigPath, tauriConfig)

// Update Cargo.toml
const cargoPath = "../../src-tauri/Cargo.toml"
let cargo = readFileSync(cargoPath, "utf8")
cargo = cargo.replace(/^version = ".*"$/m, `version = "${version}"`)
writeFileSync(cargoPath, cargo)

// Update Cargo.lock via cargo
execSync("cargo update --workspace --manifest-path ../../src-tauri/Cargo.toml", {
    stdio: "inherit",
})

console.log(`Synced version ${version} to tauri.conf.json, Cargo.toml, and Cargo.lock`)
