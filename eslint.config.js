import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import pluginReact from "eslint-plugin-react"
import { defineConfig } from "eslint/config"

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        plugins: { js },
        extends: ["js/recommended"],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        languageOptions: { globals: globals.browser },
    },
    tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    pluginReact.configs.flat["jsx-runtime"],
    {
        rules: {
            semi: ["error", "never"],
            indent: [
                "error",
                4,
                {
                    SwitchCase: 1,
                },
            ],
            quotes: [
                "error",
                "double",
                {
                    avoidEscape: true,
                },
            ],
            "eol-last": ["error", "always"],
            "comma-dangle": ["error", "always-multiline"],
            "linebreak-style": ["error", "unix"],
            "no-multiple-empty-lines": [
                "error",
                {
                    max: 1,
                },
            ],
            "keyword-spacing": [
                "error",
                {
                    before: true,
                    after: true,
                },
            ],
            "space-before-function-paren": [
                "error",
                {
                    anonymous: "never",
                    named: "never",
                    asyncArrow: "always",
                },
            ],
            "no-trailing-spaces": [
                "error",
                {
                    skipBlankLines: true,
                },
            ],
            "no-console": "warn",
            "no-alert": "error",
            "no-debugger": "error",
            "no-var": "error",

            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",

            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-empty-object-type": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    args: "none",
                    ignoreRestSiblings: true,
                    destructuredArrayIgnorePattern: "^_",
                },
            ],

            // "import/no-restricted-paths": [
            //     "error",
            //     {
            //         zones: [
            //             {
            //                 target: "./src/ui",
            //                 from: "./src/store",
            //             },
            //         ],
            //     },
            // ],
            // "import/no-extraneous-dependencies": [
            //     "error",
            //     {
            //         devDependencies: ["**/*.test.ts", "**/*.test.tsx"],
            //     },
            // ],
        },
    },
])
