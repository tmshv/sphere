# libexpression

A Rust parser and evaluator for [MapLibre Style Specification filter expressions](https://maplibre.org/maplibre-style-spec/expressions/).

Takes a JSON value representing an expression, parses it into an expression tree, and evaluates that tree against a GeoJSON feature.

## Usage

```toml
[dependencies]
libexpression = { path = "../libexpression" }
serde_json = "1.0"
```

```rust
use libexpression::{parse, evaluate, EvalContext};
use serde_json::{json, Map};

// Build a feature context
let properties: Map<String, _> = [
    ("type".to_string(), json!("small_airport")),
    ("elevation".to_string(), json!(450)),
]
.into_iter()
.collect();

let ctx = EvalContext {
    feature_id: Some(json!(42)),
    feature_type: "Point",
    properties: &properties,
};

// Parse an expression
let expr = parse(json!(["==", ["get", "type"], "small_airport"])).unwrap();

// Evaluate it
let result = evaluate(&expr, &ctx).unwrap();
assert_eq!(result, json!(true));
```

## API

```rust
// Parse a JSON value into an expression tree
pub fn parse(raw: Value) -> Result<Expr, ExprError>

// Evaluate an expression against a feature context
pub fn evaluate(expr: &Expr, ctx: &EvalContext) -> Result<Value, ExprError>

// EvalContext — the GeoJSON feature visible to the expression
pub struct EvalContext<'a> {
    pub feature_id:   Option<Value>,
    pub feature_type: &'a str,            // "Point", "LineString", "Polygon", …
    pub properties:   &'a Map<String, Value>,
}
```

`Expr` is `Box<dyn Expression>`. You can call `expr.evaluate(&ctx)` directly or use the free function.

## Feature context

| Field          | MapLibre accessor   | Description                                          |
|----------------|---------------------|------------------------------------------------------|
| `feature_id`   | `["id"]`            | GeoJSON `id` field; `None` returns `null`            |
| `feature_type` | `["geometry-type"]` | Geometry type string (`"Point"`, `"Polygon"`, …)     |
| `properties`   | `["get", key]`      | GeoJSON `properties` object                          |

## Expressions

### Literals

Scalar JSON values are expressions that return themselves.

```rust
// Numbers, strings, booleans, null
parse(json!(42))     // → 42
parse(json!("hello")) // → "hello"
parse(json!(true))   // → true
parse(json!(null))   // → null

// Arrays and objects must be wrapped in ["literal", ...]
parse(json!(["literal", [1, 2, 3]]))        // → [1, 2, 3]
parse(json!(["literal", {"key": "value"}])) // → {"key": "value"}
```

### Data access

```rust
// ["get", key] — read a property
parse(json!(["get", "name"]))
// feature: { name: "Heathrow" } → "Heathrow"
// feature: {}                   → null

// ["get", key, object_expr] — read from an explicit object
parse(json!(["get", "iata", ["properties"]]))
// feature: { iata: "LHR" } → "LHR"

// ["has", key] — property existence check
parse(json!(["has", "elevation"]))
// feature: { elevation: 450 } → true
// feature: {}                 → false

// ["id"] — GeoJSON feature id
parse(json!(["id"]))
// feature id: 42   → 42
// feature id: none → null

// ["geometry-type"] — geometry type string
parse(json!(["geometry-type"]))
// Point feature    → "Point"
// Polygon feature  → "Polygon"

// ["properties"] — full properties object
parse(json!(["properties"]))
// feature: { name: "LAX", code: "KLAX" } → {"name": "LAX", "code": "KLAX"}

// ["at", index, array] — element access; negative indices count from the end
parse(json!(["at", 0, ["literal", ["a", "b", "c"]]]))  // → "a"
parse(json!(["at", -1, ["literal", ["a", "b", "c"]]])) // → "c"

// ["length", value] — char count (string) or element count (array)
parse(json!(["length", "hello"]))                    // → 5
parse(json!(["length", ["literal", [1, 2, 3, 4]]])) // → 4
```

### Comparison

All comparison operators return a boolean. `==` and `!=` use strict type equality (cross-type comparisons return `false`). `<`, `<=`, `>`, `>=` work on numbers and strings.

```rust
// Equality
parse(json!(["==", ["get", "type"], "small_airport"]))
// feature: { type: "small_airport" } → true
// feature: { type: "large_airport" } → false

// Cross-type is always false
parse(json!(["==", 1, "1"])) // → false

// Inequality
parse(json!(["!=", ["get", "status"], "closed"]))
// feature: { status: "open" }   → true
// feature: { status: "closed" } → false

// Numeric comparison
parse(json!([">=", ["get", "elevation"], 1000]))
// feature: { elevation: 1200 } → true
// feature: { elevation: 450  } → false

// String comparison (lexicographic)
parse(json!(["<", ["get", "name"], "M"]))
// feature: { name: "Heathrow" } → true
// feature: { name: "Schiphol" } → false
```

### Logic

```rust
// ["all", ...] — true only if every argument is truthy; short-circuits
parse(json!(["all",
    ["==", ["get", "type"], "small_airport"],
    [">=", ["get", "elevation"], 0]
]))
// feature: { type: "small_airport", elevation: 450 } → true
// feature: { type: "small_airport", elevation: -5  } → false

// ["any", ...] — true if at least one argument is truthy; short-circuits
parse(json!(["any",
    ["==", ["get", "type"], "small_airport"],
    ["==", ["get", "type"], "heliport"]
]))
// feature: { type: "heliport" }     → true
// feature: { type: "large_airport"} → false

// ["!", expr] — logical not
parse(json!(["!", ["has", "elevation"]]))
// feature: { elevation: 450 } → false
// feature: {}                 → true
```

### Type coercion

```rust
// ["to-number", value, fallback*] — parse to number; tries fallbacks on failure
parse(json!(["to-number", ["get", "elevation"]]))
// feature: { elevation: "1200" } → 1200.0
// feature: { elevation: null   } → null

parse(json!(["to-number", ["get", "code"], 0]))
// feature: { code: "LHR" } → 0  (fallback used)

// ["to-string", value]
parse(json!(["to-string", ["get", "elevation"]]))
// feature: { elevation: 1200 } → "1200"
// feature: { elevation: null } → ""

// ["to-boolean", value]
parse(json!(["to-boolean", ["get", "active"]]))
// feature: { active: 1  } → true
// feature: { active: 0  } → false
// feature: { active: "" } → false

// ["typeof", value] — returns "null", "boolean", "number", "string", "array", or "object"
parse(json!(["typeof", ["get", "elevation"]]))
// feature: { elevation: 450  } → "number"
// feature: { elevation: "hi" } → "string"
// feature: {}                  → "null"
```

### String operations

```rust
// ["concat", ...] — concatenate; coerces all values to strings
parse(json!(["concat", ["get", "city"], " (", ["get", "iata"], ")"]))
// feature: { city: "London", iata: "LHR" } → "London (LHR)"

// ["downcase", string]
parse(json!(["downcase", ["get", "name"]]))
// feature: { name: "Heathrow" } → "heathrow"

// ["upcase", string]
parse(json!(["upcase", ["get", "code"]]))
// feature: { code: "lhr" } → "LHR"

// ["slice", value, from, to?] — char-based; negative indices supported
parse(json!(["slice", ["get", "iata"], 0, 2]))
// feature: { iata: "EGLL" } → "EG"

parse(json!(["slice", ["get", "iata"], -2]))
// feature: { iata: "EGLL" } → "LL"

// ["index-of", needle, haystack, from?] — first index or -1; char-based for strings
parse(json!(["index-of", "port", ["get", "name"]]))
// feature: { name: "Heathrow Airport" } → 10
// feature: { name: "Heathrow"         } → -1

// Works on arrays too
parse(json!(["index-of", "b", ["literal", ["a", "b", "c"]]]))
// → 1
```

### Math

All arithmetic operators coerce their operands: strings are parsed as numbers, booleans become `1.0`/`0.0`. Division by zero returns `null`.

```rust
// Variadic: +, *
parse(json!(["+", 1, 2, 3]))   // → 6
parse(json!(["*", 2, 3, 4]))   // → 24

// Binary: -, /, %, ^
parse(json!(["-", 10, 3]))   // → 7
parse(json!(["/", 10, 4]))   // → 2.5
parse(json!(["%", 10, 3]))   // → 1
parse(json!(["^", 2, 8]))    // → 256

// Unary negation
parse(json!(["-", ["get", "elevation"]]))
// feature: { elevation: 450 } → -450

// min / max
parse(json!(["min", ["get", "a"], ["get", "b"], 100]))
// feature: { a: 42, b: 75 } → 42

// Rounding
parse(json!(["round", 3.7]))   // → 4
parse(json!(["floor", 3.7]))   // → 3
parse(json!(["ceil",  3.2]))   // → 4
parse(json!(["abs",  -5.5]))   // → 5.5
parse(json!(["sqrt",    9]))   // → 3

// Transcendental
parse(json!(["ln",   ["e"]]))  // → 1.0
parse(json!(["log2",   8]))    // → 3.0
parse(json!(["log10", 100]))   // → 2.0

// Constants
parse(json!(["e"]))   // → 2.718281828…
parse(json!(["pi"]))  // → 3.141592653…
```

### Control flow

```rust
// ["case", cond1, out1, ..., fallback] — if/else chain
parse(json!(["case",
    ["<", ["get", "elevation"], 0],    "below sea level",
    ["<", ["get", "elevation"], 1000], "lowland",
    "highland"
]))
// feature: { elevation: -10  } → "below sea level"
// feature: { elevation: 450  } → "lowland"
// feature: { elevation: 2000 } → "highland"

// ["match", input, label, out, ..., fallback] — switch/case; labels can be arrays
parse(json!(["match", ["get", "type"],
    "small_airport",  "small",
    ["large_airport", "medium_airport"], "large or medium",
    "other"
]))
// feature: { type: "small_airport"  } → "small"
// feature: { type: "large_airport"  } → "large or medium"
// feature: { type: "medium_airport" } → "large or medium"
// feature: { type: "heliport"       } → "other"

// ["coalesce", ...] — first non-null value
parse(json!(["coalesce", ["get", "name"], ["get", "code"], "unknown"]))
// feature: { name: "Heathrow" } → "Heathrow"
// feature: { code: "LHR"     } → "LHR"
// feature: {}                  → "unknown"

// ["step", input, initial, stop1, out1, stop2, out2, ...] — stepped range
parse(json!(["step", ["get", "elevation"],
    "unknown",
    0,    "sea level",
    500,  "low",
    2000, "high"
]))
// feature: { elevation: -5   } → "unknown"   (below first stop)
// feature: { elevation: 0    } → "sea level"
// feature: { elevation: 800  } → "low"
// feature: { elevation: 3000 } → "high"

// ["interpolate", ["linear"], input, stop1, val1, stop2, val2, ...] — linear interpolation
parse(json!(["interpolate", ["linear"], ["get", "elevation"],
    0,    0.0,
    1000, 0.5,
    4000, 1.0
]))
// feature: { elevation: 0    } → 0.0
// feature: { elevation: 500  } → 0.25
// feature: { elevation: 1000 } → 0.5
// feature: { elevation: 4000 } → 1.0
// feature: { elevation: 5000 } → 1.0  (clamped)
```

### Membership

```rust
// ["in", needle, haystack] — substring check or array membership
parse(json!(["in", "port", ["get", "name"]]))
// feature: { name: "Heathrow Airport" } → true
// feature: { name: "Heathrow"         } → false

parse(json!(["in", ["get", "type"], ["literal", ["small_airport", "heliport"]]]))
// feature: { type: "heliport"     } → true
// feature: { type: "large_airport"} → false

// ["!in", needle, haystack] — negation of ["in"]
parse(json!(["!in", ["get", "type"], ["literal", ["closed", "restricted"]]]))
// feature: { type: "small_airport" } → true
// feature: { type: "closed"        } → false
```

## Error handling

```rust
use libexpression::ExprError;

match parse(json!(["unknown-op", 1, 2])) {
    Err(ExprError::UnknownOperator(op)) => eprintln!("unknown operator: {op}"),
    Err(ExprError::ArityMismatch { operator, expected, got }) =>
        eprintln!("{operator} expects {expected} args, got {got}"),
    Err(e) => eprintln!("parse error: {e}"),
    Ok(_) => {}
}
```

Parse errors are returned for:
- Unknown operator names (`ExprError::UnknownOperator`)
- Wrong argument count (`ExprError::ArityMismatch`)
- Structurally invalid expressions (`ExprError::InvalidExpression`)
- Wrong literal types where a specific type is required at parse time (`ExprError::TypeMismatch`)

Runtime errors are rare — most type mismatches during evaluation silently return `null` rather than an error (e.g., missing property, non-numeric input to a comparison, division by zero).

## Supported operators

| Category    | Operators                                                                                              |
|-------------|--------------------------------------------------------------------------------------------------------|
| Literal     | _(scalar JSON)_, `literal`                                                                             |
| Data        | `get`, `has`, `id`, `geometry-type`, `properties`, `at`, `length`                                     |
| Comparison  | `==`, `!=`, `<`, `<=`, `>`, `>=`                                                                       |
| Logic       | `all`, `any`, `!`                                                                                      |
| Coercion    | `to-number`, `to-string`, `to-boolean`, `typeof`                                                       |
| String      | `concat`, `downcase`, `upcase`, `slice`, `index-of`                                                    |
| Math        | `+`, `-`, `*`, `/`, `%`, `^`, `abs`, `ceil`, `floor`, `round`, `sqrt`, `min`, `max`, `ln`, `log2`, `log10`, `asin`, `acos`, `atan`, `sin`, `cos`, `tan`, `e`, `pi` |
| Control     | `case`, `match`, `step`, `coalesce`, `interpolate`                                                     |
| Membership  | `in`, `!in`                                                                                            |

## Limitations

- `["interpolate"]` only supports `["linear"]` interpolation. `["exponential"]` and `["cubic-bezier"]` are rejected at parse time.
- No support for `["format"]`, `["image"]`, `["number-format"]`, or other rendering-specific operators.
- No zoom-based evaluation — `["zoom"]` is not implemented.
