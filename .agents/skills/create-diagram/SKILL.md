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
5. Write one complete JSON document, normalize it, and validate it from the DiaFlow repository root:

   ```sh
   npm run diagrams:normalize -- path/to/file.diagram.json
   npm run diagrams:validate -- path/to/file.diagram.json
   ```

6. Fix every structural and reference-integrity error before finishing. Report the file path and validation result.

## Authoring Rules

- Use only schema-supported values. Version `0.2` supports node types `user`, `browser`, `mobile`, `load_balancer`, `api`, `app`, `server`, `worker`, `database`, `cache`, `queue`, `storage`, `cdn`, `external_service`, `network`, `group`, and `unknown`.
- Use stable semantic IDs beginning with a letter. Keep IDs unique within each entity collection.
- Lay out the primary flow from left to right with non-overlapping node rectangles. Leave enough spacing for edge labels and groups.
- Make every edge endpoint reference an existing node and existing port when `portId` is present.
- Use namespaced Material Symbols IDs for new node icons. Recommended values include `material-symbols:person`, `material-symbols:web`, `material-symbols:smartphone`, `material-symbols:dns`, `material-symbols:api`, `material-symbols:deployed_code`, `material-symbols:database`, `material-symbols:storage`, `material-symbols:cached`, `material-symbols:hub`, `material-symbols:lan`, `material-symbols:key`, `material-symbols:lock`, and `material-symbols:shield`. Omit `icon` to use the node type default; do not invent unsupported IDs.
- Use only supported color values. For theme accent and edge colors, prefer semantic presets `accent`, `primary`, `muted`, `neutral`, `success`, `warning`, `danger`, `info` or palette presets `blue`, `green`, `amber`, `red`, `violet`, `slate`; edge colors may also use `default`. Use custom colors only as six-digit `#rrggbb` hex values. Do not use CSS named colors, `rgb()`, `hsl()`, or short hex.
- Store group membership only in `Group.nodeIds`. Do not add `Node.groupId`, repeat a node ID, or place one node in multiple groups.
- Store animation membership only in `Animation.edgeIds`. Do not add `Edge.animationId` or repeat an edge ID within one animation.
- Use `arrow`, `triangle`, `circle`, or `none` for endpoint markers. Use animation and scenes to communicate behavior, not decoration.
- Create at least one scene. Use a `Default Scene` when the request has no scenario progression.
- Keep node and edge topology shared across scenes. Express step-specific node label, type, icon,
  position, tone, or status changes through `nodeOverrides`; express edge label, style, tone, or
  disabled-state changes through `edgeOverrides`; select active animations with `animationIds`.
- Keep `Scene.animationIds` unique and add at most one node or edge override for each target in a scene.
- Preserve arbitrary domain extensions only inside `Node.data`, `Edge.data`, or `Animation.payload`; structural objects reject unknown fields.
- Use ISO 8601 UTC timestamps when timestamps are included.
- Format the result as readable JSON with a trailing newline.

## Optional Local Preview

After successful normalization and validation, check whether the local DiaFlow development server is reachable at its expected local address without starting it.

- If the server is running, report its URL and tell the user to open the generated `.diagram.json` through the editor.
- If the server is not running and the task is interactive, ask whether the user wants to start it. Start it from the DiaFlow repository root only after confirmation, then report the actual URL printed by the development server.
- If the user already requested a local preview or server startup, treat that as confirmation and do not ask again.
- Skip the preview offer for batch, CI, or explicitly file-only requests.
- Do not treat preview availability or server startup failure as diagram-generation failure.
- Do not copy the diagram into application or public directories solely for preview.

## Output Boundary

Create or modify only the requested `.diagram.json` artifact. Do not implement renderer or editor code as part of diagram generation. Do not paste the entire document in the final response unless the user asks to see it.
