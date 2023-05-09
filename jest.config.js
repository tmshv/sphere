import { pathsToModuleNameMapper } from "ts-jest"

// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
import tsconfig from "./tsconfig.json" assert { type: "json" }

/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    roots: ["<rootDir>"],
    modulePaths: [tsconfig.compilerOptions.baseUrl],
    moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix: "<rootDir>/" }),
}
export default config
