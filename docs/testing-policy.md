# Testing Policy

## Purpose

This project treats `Diagram JSON`, the renderer, and embed behavior as core product contracts.

Every feature that changes those contracts should include regression tests.

## Current Test Stack

- Test runner: Vitest
- DOM environment: jsdom
- Command: `npm test`
- Full local check: `npm run check`

`npm run check` verifies the generated JSON Schema, checks canonical example serialization,
validates example diagrams, runs tests, and then creates the production build.

```sh
npm run check
```

Schema-specific commands:

```sh
npm run schema:generate     # Regenerate schemas/diagram.schema.json from Zod
npm run schema:check        # Detect generated-schema drift
npm run diagrams:normalize # Rewrite Diagram JSON with canonical defaults and formatting
npm run diagrams:normalize:check # Detect non-canonical bundled examples
npm run diagrams:validate   # Validate structure, then cross-document references
```

The generated public JSON Schema performs structural validation through Ajv. After that succeeds,
`validateDiagramIntegrity()` checks duplicate IDs, edge endpoints, ports, group membership,
animation edge membership, and scene references.

Amplify also runs tests before building the deploy artifact.

## Test Layers

### Schema Tests

Location:

```txt
packages/schema/src/*.test.ts
```

Use schema tests when changing:

- Diagram JSON fields
- node types
- edge style options
- animation options
- validation rules
- duplicate IDs, duplicate membership references, and cross-document reference integrity
- single-group node membership and unique scene override targets
- sample diagram compatibility

Schema tests should verify both accepted and rejected examples.

Examples:

- A valid sample diagram parses successfully.
- Unsupported `diagram.kind` values are rejected.
- Unsupported `edge.style.labelPlacement` values are rejected.

### Runtime Tests

Location:

```txt
packages/runtime/src/*.test.ts
```

Use runtime tests when changing:

- SVG rendering
- node rendering
- edge rendering
- label placement
- packet animation rendering
- grid behavior
- zoom/pan behavior
- renderer options
- partial node and edge rendering
- lifecycle behavior such as `destroy()`

Runtime tests should verify DOM structure and stable SVG attributes. They should not depend on screenshots.

Examples:

- The sample diagram renders 6 nodes and 5 edges.
- Edge labels render `center`, `above`, and `below` placements.
- Animation and label toggles add/remove the expected CSS classes.
- Wheel zoom clamps to the configured minimum and maximum zoom levels.
- Adaptive grid opacity and width values remain stable at maximum zoom out.

### Editor Tests

Location:

```txt
packages/editor/src/*.test.ts
apps/demo/src/*.test.tsx
```

Editor tests should be added when the React editor gains real user workflows.

Use editor tests when changing:

- toolbar behavior
- side panels
- prompt input
- node/edge editing UI
- node creation and cascading deletion
- edit transaction and Undo/Redo boundaries
- single and multi-selection behavior
- publish flow
- embed code generation
- validation messages

Editor tests should focus on user-visible behavior, not implementation details.

### Local Document Tests

Location:

```txt
apps/demo/src/document-files.test.ts
apps/demo/src/App.test.tsx
```

Use local document tests when changing:

- empty diagram creation
- Diagram JSON file parsing and readable validation errors
- JSON serialization and round-trip compatibility
- file name normalization and download behavior
- dirty state and unsaved-page warnings

## What Must Be Tested

Add or update tests when a change affects:

- Diagram JSON schema
- renderer output
- visual semantics such as label placement or animation behavior
- interaction behavior such as pan, zoom, drag, or selection
- embed runtime behavior
- publish/embed contract
- bug fixes

Bug fixes should include a regression test that fails before the fix and passes after it.

## What Does Not Need Immediate Tests

Tests are optional for:

- copy-only changes
- documentation-only changes
- purely cosmetic CSS changes that do not affect runtime classes, layout contracts, or SVG attributes
- temporary prototypes that are not wired into product behavior

If a cosmetic change affects readability at different zoom levels, label positions, or embed output, it should be tested.

## Test Data

The canonical sample diagram is:

```txt
examples/basic-web-architecture.diagram.json
```

Tests may use the canonical sample for broad compatibility checks.

When testing a specific edge case, create a small inline diagram object inside the test instead of overloading the sample file.

## CI And Deployment

Deployment should not proceed if tests fail.

Amplify build steps should keep this order:

```sh
npm ci
npm test
npm run build
```

## Node Version Note

The project standardizes on Node.js 24. The local version is declared in `.nvmrc`, and Amplify selects the same major version before installing dependencies.

The test environment currently uses:

- Vitest 4
- jsdom 29

After changing the Node.js or test-tooling versions, verify both a clean install and the complete check:

```sh
npm ci
npm run check
```
