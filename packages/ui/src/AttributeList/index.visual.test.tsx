import { visualCases } from "../visual/visualCases"
import { AttributeList, type FieldEntry } from "."

const HISTOGRAM = [2, 5, 9, 14, 8, 3]

const LOADING: FieldEntry = { name: "population", type: "number", summary: { kind: "loading" } }
const NUMERIC: FieldEntry = {
    name: "population",
    type: "number",
    nullCount: 3,
    summary: { kind: "numeric", min: 10, max: 4200, mean: 1350.5, histogram: HISTOGRAM },
}
const STRING: FieldEntry = {
    name: "country",
    type: "string",
    summary: {
        kind: "string",
        unique: 12,
        topValues: [
            ["Germany", 40],
            ["France", 22],
            ["Italy", 9],
        ],
    },
}
const ERROR: FieldEntry = { name: "notes", type: "string", summary: { kind: "error" } }

visualCases("AttributeList", {
    empty: { render: () => <AttributeList fields={[]} /> },
    loading: { render: () => <AttributeList fields={[LOADING]} /> },
    numeric: { render: () => <AttributeList fields={[NUMERIC]} /> },
    string: { render: () => <AttributeList fields={[STRING]} /> },
    error: { render: () => <AttributeList fields={[ERROR]} /> },
})
