# DiaFlow

DiaFlow helps you turn technical systems into interactive diagrams that people can explore, edit,
and play through.

**Diagrams that explain themselves: interactive, easy to create and refine, scenario-aware,
embeddable anywhere, and readable by both people and AI.**

Every diagram is saved as structured `Diagram JSON`, so it stays editable and portable. DiaFlow
turns that data into an interactive SVG experience in the browser.

> 🚧 **Project status:** DiaFlow is an early public prototype. Diagram JSON currently uses
> `schemaVersion: "0.2"`, and its APIs and file format may change before the first stable release.

## 🌟 Why DiaFlow?

- 💡 **Self-explanatory.** A diagram should communicate its structure and behavior without requiring
  a separate wall of text. Labels, visual hierarchy, animation, and scenes should work together to
  explain the system.
- 🖱️ **Interactive by default.** A diagram should be explored, inspected, zoomed, and played rather
  than consumed as a fixed image.
- ✏️ **Easy to create and refine.** Start from a structured draft, then adjust nodes, connections,
  layout, labels, and behavior visually without losing the underlying model.
- 🎬 **Scenario-driven.** Use the same architecture to explain normal operation, failures, retries,
  recovery, and other changes over time.
- 🌍 **Embed anywhere.** Diagrams should remain interactive inside technical blogs, documentation,
  websites, and wikis instead of being exported only as static images.
- 🤖 **Readable by people and AI.** Diagram JSON gives humans, editors, validators, and language models
  one explicit format they can all inspect and modify.

These principles describe the product direction. The local editor and scene runtime already cover
part of this experience; standalone embedding remains roadmap work, while the first public LLM
skills are available for local use.

## ✨ What Works Today

- Schema-validated Diagram JSON with semantic reference checks
- Deterministic SVG rendering from Diagram JSON
- Pan, zoom, and an adaptive canvas grid
- Node creation, cascading deletion, selection, editing, dragging, and Shift-based multi-selection
- Edge selection and editing, including markers, routing, line styles, colors, and labels
- Scene playback and animated data-flow examples
- Local `New diagram`, `Open`, and `Save as` workflows
- Dirty-state tracking and unsaved-page warnings
- Runtime, editor, and schema packages with regression tests

## 🚀 Quick Start

### Requirements

- Node.js 24 or later
- npm

The required Node.js major version is recorded in [`.nvmrc`](.nvmrc).

### Run Locally

```sh
git clone https://github.com/gyugyu90/DiaFlow.git
cd DiaFlow
nvm install
nvm use
npm install
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) in a browser.

The first screen contains the bundled examples and actions for opening an existing
`.diagram.json` file or creating a new empty document.

## 💾 Work with Local Files

1. Select **Open** to load an existing `.diagram.json` file, or select **New diagram** to create
   an empty schema-valid document.
2. Add, select, move, edit, or delete nodes and edit supported edge properties on the canvas.
3. Select **Save as** to download the current document as a `.diagram.json` file.
4. Reopen that file later to continue editing.

Opened files are validated against both the structural schema and cross-document reference rules.
Invalid JSON, missing or malformed fields, duplicate IDs, and broken references are reported in the
application.

Directly overwriting the original file through the File System Access API is not implemented yet.
`Save as` currently uses the browser download flow.

## 🧩 Diagram JSON

Diagram JSON is a project-defined format, not an existing standard. Its main document model is:

```txt
Diagram
|- Metadata
|- Viewport
|- Theme
|- Nodes
|- Edges
|- Groups
|- Animations
`- Scenes
```

Each node, edge, animation, group, and scene has a stable ID. References between those entities
are checked when a document is parsed.

See the following resources:

- [Diagram JSON design draft](docs/diagram-json-schema-draft.md)
- [JSON Schema](schemas/diagram.schema.json)
- [Basic web architecture example](examples/basic-web-architecture.diagram.json)
- [Circuit breaker scenes example](examples/circuit-breaker-scenes.diagram.json)

The Zod definition in `packages/schema/src/index.ts` is the schema source of truth.
`schemas/diagram.schema.json` is generated from it and should not be edited by hand.

```sh
npm run schema:generate     # Regenerate the public JSON Schema
npm run schema:check        # Fail when the generated file is out of sync
npm run diagrams:validate   # Run structural and reference-integrity checks on examples
```

## 🤖 LLM Skills

DiaFlow includes two service-neutral skills that work with local files and the repository schema:

- [`create-diagram`](skills/create-diagram/SKILL.md) creates a new schema-valid Diagram JSON file
  from an architecture or scenario description.
- [`update-diagram`](skills/update-diagram/SKILL.md) locates an existing diagram by exact path,
  filename, metadata title, or a title mentioned in the prompt, then updates it without breaking
  IDs and references.

Codex users can symlink the skills into their personal skill directory while keeping them connected
to the cloned repository:

```sh
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
ln -s "$PWD/skills/create-diagram" "${CODEX_HOME:-$HOME/.codex}/skills/create-diagram"
ln -s "$PWD/skills/update-diagram" "${CODEX_HOME:-$HOME/.codex}/skills/update-diagram"
```

Invoke them explicitly with prompts such as `$create-diagram Draw a web checkout architecture` or
`$update-diagram title: "Web Checkout" Add a retry queue after the worker`. Other LLM tools can use
the instructions in each `SKILL.md` without authentication or a hosted DiaFlow service.

Both skills target `schemaVersion: "0.2"` and run the repository validator before completing a
change. Keep the skills, examples, and schema documentation synchronized when the contract changes.

## 🏗️ Project Structure

```txt
apps/
  demo/       Local DiaFlow application and example gallery

packages/
  schema/     Diagram JSON types, structural validation, and reference validation
  runtime/    Read-only SVG rendering, viewport behavior, and scene playback
  editor/     Selection, dragging, property editing, and edit history

examples/     Example .diagram.json documents
schemas/      Generated public JSON Schema
scripts/      Schema generation and Diagram JSON validation tools
skills/       LLM skills for creating and updating Diagram JSON
docs/         Format and testing documentation
```

The package namespace remains `@interactive-diagram/*` for now. These packages are workspace
packages and are not yet documented as a stable public npm API.

## 🛠️ Build and Test

```sh
npm run dev      # Start the local Vite development server
npm test         # Run the Vitest suite
npm run build    # Type-check packages and build the demo
npm run check    # Check schema sync, validate examples, test, and build
npm run preview  # Preview the production build locally
```

Changes to the schema, renderer output, editor behavior, or local document workflow should include
regression tests. See the [testing policy](docs/testing-policy.md) for the expected test layers.

## 🚀 Deployment

The gallery is served at `/`, while each bundled diagram editor uses
`/diagrams/:diagramId/edit`. Static hosts must rewrite client-side routes to `index.html`.

For AWS Amplify Hosting, add the following 200 rewrite under **Rewrites and redirects** so direct
editor links and browser refreshes continue to load the application while static assets remain
untouched:

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "status": "200",
    "target": "/index.html",
    "condition": null
  }
]
```

## 🚧 Good to Know

- The editor cannot yet create or delete edges from the UI.
- Deleting a node also deletes every edge connected to it.
- Direct `Save` through the File System Access API is not available.
- Group and scene authoring are not available in the editor.
- The prompt field does not call an AI service.
- The standalone iframe/script embed runtime has not been released.
- Schema migration between versions is not implemented.

## 🗺️ Where DiaFlow Is Heading

Here is what comes next for the local-first experience:

1. Add edge creation and deletion.
2. Support direct file saving where the browser permits it.
3. Separate the local editor from the sample gallery entry point.
4. Produce a standalone read-only iframe viewer.
5. Document self-hosted embedding for blogs and documentation sites.
6. Expand the LLM skills with validated scenario examples and broader agent installation guidance.

The detailed working list is maintained in [TODO.md](TODO.md).

## 🤝 Contributing

DiaFlow is being developed in public. Focused issues and pull requests are welcome, especially for
schema correctness, renderer compatibility, editor usability, accessibility, testing, and
self-hosted embedding.

Before submitting a change:

1. Keep the change within the existing schema, runtime, editor, or demo ownership boundary.
2. Add regression coverage for behavior changes and bug fixes.
3. Run `npm run check`.
4. Update the relevant documentation when changing Diagram JSON or a public contract.

## 📄 License

DiaFlow is available under the [MIT License](LICENSE).
