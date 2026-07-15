---
name: update-diagram
description: Find and safely update an existing DiaFlow .diagram.json file while preserving stable IDs and reference integrity. Use when the user asks to change, edit, revise, rename, extend, or remove content from a diagram identified by path, filename, metadata title, or natural-language context.
---

# Update DiaFlow Diagram

Resolve exactly one existing Diagram JSON document, make the smallest requested change, and validate the result. Keep Diagram JSON as the source of truth; never replace it with SVG, HTML, Canvas code, or an image.

## Compatibility

Target DiaFlow `schemaVersion: "0.2"`. Read `packages/schema/src/index.ts` or `schemas/diagram.schema.json` before changing schema-sensitive fields.

## Identify The Target

Accept selectors written naturally or as explicit prompt fields such as `path:`, `filename:`, and `title:`. Resolve them in this order:

1. exact path
2. exact filename
3. exact `metadata.title`, case-insensitive
4. filename or title explicitly contained in the natural-language request

Use the bundled resolver from the DiaFlow repository root:

```sh
node .agents/skills/update-diagram/scripts/find-diagram.mjs --root . --path diagrams/api.diagram.json
node .agents/skills/update-diagram/scripts/find-diagram.mjs --root . --filename api.diagram.json
node .agents/skills/update-diagram/scripts/find-diagram.mjs --root . --title "API Overview"
node .agents/skills/update-diagram/scripts/find-diagram.mjs --root . --query "Update the API Overview diagram"
```

Do not guess when resolution returns no file or multiple files. Show the candidates and ask for a path or filename. Never update multiple diagrams unless the user explicitly requests a batch change.

## Workflow

1. Resolve one target file and read it completely.
2. Validate the unchanged input from the DiaFlow repository root:

   ```sh
   npm run diagrams:validate -- path/to/file.diagram.json
   ```

3. Translate the request into the smallest JSON change. Preserve formatting style where practical.
4. Update `metadata.updatedAt` to the current ISO 8601 UTC timestamp when that field exists. Do not invent `createdAt` or rewrite it.
5. Normalize and validate the edited file. Fix every structural and reference-integrity error before finishing.

   ```sh
   npm run diagrams:normalize -- path/to/file.diagram.json
   npm run diagrams:validate -- path/to/file.diagram.json
   ```

6. Report the resolved path, concise changes, and validation result.

## Preservation Rules

- Preserve IDs for existing entities, even when labels or titles change. Add a new stable ID only for a new entity.
- Preserve unrelated fields, ordering, extension data, viewport, theme, and scene behavior.
- Preserve an existing custom or legacy icon ID unless the requested change affects that icon. Use a supported namespaced `material-symbols:*` ID for new icon choices; do not invent unsupported IDs.
- Use only supported color values when changing theme or edge colors. Preserve existing valid colors unless the request affects them. Prefer semantic presets `accent`, `primary`, `muted`, `neutral`, `success`, `warning`, `danger`, `info` or palette presets `blue`, `green`, `amber`, `red`, `violet`, `slate`; edge colors may also use `default`. Use custom colors only as six-digit `#rrggbb` hex values. Do not use CSS named colors, `rgb()`, `hsl()`, or short hex.
- Keep group membership only in `Group.nodeIds`; do not repeat a node ID or place one node in multiple groups.
- Keep animation membership only in `Animation.edgeIds` and do not repeat an edge ID within one animation.
- When deleting a node, also delete or update edges that reference it, remove its ID from groups, and remove affected scene node overrides.
- When deleting an edge, remove its ID from animations and scene edge overrides. Remove or adjust animations that would otherwise have an empty `edgeIds` array.
- When deleting an animation, remove its ID from every scene's `animationIds`.
- When changing ports, repair every edge endpoint that references the changed port.
- Keep scenes as overrides over shared nodes and edges; do not duplicate the full graph per scene.
- Keep `Scene.animationIds` unique and preserve at most one node or edge override for each target in a scene.
- Put arbitrary extensions only in `Node.data`, `Edge.data`, or `Animation.payload`; structural objects are strict.
- Do not make unrelated visual cleanup or schema migrations unless requested.

## Output Boundary

Modify only the resolved `.diagram.json` file unless validation requires a directly related repair. Do not modify runtime or editor source while carrying out a diagram-content request.
