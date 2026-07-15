---
name: create-diagram
description: Create new DiaFlow .diagram.json files from natural-language architecture or scenario descriptions. Use when the user asks to create, generate, draft, or model a new interactive architecture diagram with nodes, edges, groups, animations, or scenes.
---

# Create DiaFlow Diagram

Create a schema-valid Diagram JSON document that remains editable in DiaFlow. Generate JSON as the source of truth, never SVG, HTML, Canvas code, or a rendered image.

## Compatibility

Target DiaFlow `schemaVersion: "0.2"`. Treat the repository's `packages/schema/src/index.ts` as the source of truth and `schemas/diagram.schema.json` as the public validation contract. Read the current schema before authoring instead of relying on memory.

## Workflow

1. Locate the DiaFlow repository root containing `schemas/diagram.schema.json` and `package.json`.
2. Read `schemas/diagram.schema.json`. Consult `docs/diagram-json-schema-draft.md` and the closest file in `examples/` when layout, animation, or scene behavior is needed.
3. Extract the requested components, relationships, flows, and scenario steps. Ask a question only when a missing detail prevents a coherent diagram; otherwise choose conservative architecture defaults.
4. Use the requested output path. When none is given, derive a lowercase hyphenated filename ending in `.diagram.json` in the current directory. Never overwrite an existing file unless the user explicitly requests it.
5. Write one complete JSON document and validate it from the DiaFlow repository root:

   ```sh
   npm run diagrams:validate -- path/to/file.diagram.json
   ```

6. Fix every structural and reference-integrity error before finishing. Report the file path and validation result.

## Authoring Rules

- Use only schema-supported values. Version `0.2` supports node types `user`, `browser`, `mobile`, `load_balancer`, `api`, `app`, `server`, `worker`, `database`, `cache`, `queue`, `storage`, `cdn`, `external_service`, `network`, `group`, and `unknown`.
- Use stable semantic IDs beginning with a letter. Keep IDs unique within each entity collection.
- Lay out the primary flow from left to right with non-overlapping node rectangles. Leave enough spacing for edge labels and groups.
- Make every edge endpoint reference an existing node and existing port when `portId` is present.
- Store group membership only in `Group.nodeIds`. Do not add `Node.groupId`.
- Store animation membership only in `Animation.edgeIds`. Do not add `Edge.animationId`.
- Use `arrow`, `triangle`, `circle`, or `none` for endpoint markers. Use animation and scenes to communicate behavior, not decoration.
- Create at least one scene. Use a `Default Scene` when the request has no scenario progression.
- Keep nodes and edges shared across scenes. Express step-specific changes through `nodeOverrides`, `edgeOverrides`, and `animationIds`.
- Preserve arbitrary domain extensions only inside `Node.data`, `Edge.data`, or `Animation.payload`; structural objects reject unknown fields.
- Use ISO 8601 UTC timestamps when timestamps are included.
- Format the result as readable JSON with a trailing newline.

## Output Boundary

Create or modify only the requested `.diagram.json` artifact. Do not implement renderer or editor code as part of diagram generation. Do not paste the entire document in the final response unless the user asks to see it.
