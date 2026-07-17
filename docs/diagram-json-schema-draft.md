# Diagram JSON Schema Draft

## Purpose

`Diagram JSON` is the source-of-truth document format for interactive diagrams in DiaFlow.

It is not an existing standard. It is a project-defined schema designed for:

- AI-generated architecture diagram drafts
- Visual editing
- Deterministic rendering
- Flow animation
- iframe embedding
- Version history

Renderer output such as SVG, Canvas pixels, PNG, or HTML is not the source. Those outputs are derived from this JSON.

## Core Principle

```txt
Diagram JSON = editable model
Renderer output = derived view
```

The renderer must only consume Diagram JSON. It must not call AI or infer hidden state.

All structural objects reject unknown fields so misspelled AI-generated properties fail validation
instead of being silently discarded. Arbitrary extension properties are allowed only inside
`Node.data`, `Edge.data`, and `Animation.payload`.

## Canonical Serialization

DiaFlow accepts documents that omit supported defaults, then normalizes them before editing or
saving. Canonical `.diagram.json` files explicitly store behavior and appearance defaults so the
same file remains understandable to people, LLMs, and future runtime versions.

Canonical output includes:

- edge `direction`
- edge `line`, `routing`, `color`, `labelPlacement`, `startMarker`, and `endMarker`
- animation `direction`, `speed`, and `loop`
- group `style.variant`

The normalizer preserves entity and collection order. It does not add optional descriptions,
timestamps, extension data, groups, animations, or scenes that were not present. Normalization is
idempotent: normalizing canonical output again produces the same document.

```sh
npm run diagrams:normalize -- path/to/file.diagram.json
npm run diagrams:normalize:check
```

## MVP Scope

The first schema version targets system architecture diagrams.

Supported in the MVP:

- Nodes such as user, browser, server, app, database, storage, cache, queue, load balancer
- Directed and undirected edges
- Static edges
- Packet-style animated edges
- Scene-based step playback
- Manual node positions
- Basic groups
- Basic theme
- iframe embed metadata

Out of scope for the first schema version:

- Realtime collaboration
- Freeform whiteboard drawing
- ERD-specific relationships
- Sequence diagram lifelines
- Workflow-specific state machines
- Presentation mode

## Document Shape

```json
{
  "schemaVersion": "0.2",
  "id": "diagram_web_architecture",
  "kind": "architecture",
  "metadata": {},
  "viewport": {},
  "theme": {},
  "nodes": [],
  "edges": [],
  "groups": [],
  "animations": [],
  "scenes": []
}
```

## Top-Level Fields

### `schemaVersion`

Schema version used to interpret the document.

```json
"schemaVersion": "0.2"
```

Version `0.2` makes collection membership single-directional:

- Groups own membership through `Group.nodeIds`; remove `Node.groupId`.
- Animations own membership through `Animation.edgeIds`; remove `Edge.animationId`.
- Scenes select animations through `Scene.animationIds`; remove `animationId` from edge overrides.

Membership arrays contain unique IDs. A node can belong to at most one group, while an edge can
participate in multiple animations as long as it appears only once within each animation.

When migrating a `0.1` document, copy any inverse references into the owning ID arrays before
removing the deprecated fields and changing `schemaVersion` to `0.2`.

### `id`

Stable diagram identifier.

```json
"id": "diagram_web_architecture"
```

### `kind`

Diagram vertical. The MVP only supports `architecture`.

```json
"kind": "architecture"
```

Future values may include:

- `erd`
- `workflow`
- `sequence`
- `agent_flow`
- `education`

### `metadata`

Human-facing and product-facing metadata.

```json
{
  "title": "Basic Web Architecture",
  "description": "Browser requests flow through a load balancer to app servers and storage.",
  "createdAt": "2026-07-08T00:00:00.000Z",
  "updatedAt": "2026-07-08T00:00:00.000Z",
  "tags": ["web", "architecture", "mvp"]
}
```

### `viewport`

Initial camera state for editor and embed runtime.

```json
{
  "x": 0,
  "y": 0,
  "zoom": 1
}
```

### `theme`

Visual theme configuration.

```json
{
  "mode": "light",
  "accent": "blue",
  "background": "#f8fafc"
}
```

Theme values:

- `mode`: `light` or `dark`
- `accent`: color preset token or six-digit `#rrggbb` hex color
- `background`: six-digit `#rrggbb` hex color

### Color Values

DiaFlow accepts a limited color vocabulary so AI-generated documents, editor controls, and runtime
rendering use the same contract.

Semantic presets:

```txt
accent
primary
muted
neutral
success
warning
danger
info
```

Palette presets:

```txt
blue
green
amber
red
violet
slate
```

Edge colors also support `default`. Custom colors must use six-digit hex syntax such as `#2f6fed`
or `#19A974`. CSS named colors, `rgb()`, `rgba()`, `hsl()`, short hex such as `#fff`, and other CSS
color functions are intentionally rejected by schema version `0.2`.

## Node

Nodes represent architecture components.

```json
{
  "id": "app_server",
  "type": "app",
  "label": "App Server",
  "description": "Runs the application business logic.",
  "position": { "x": 520, "y": 240 },
  "size": { "width": 160, "height": 80 },
  "icon": "material-symbols:dns",
  "ports": [
    { "id": "in", "side": "left" },
    { "id": "out", "side": "right" }
  ],
  "data": {}
}
```

### Node Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable node identifier. Edges reference this value. |
| `type` | yes | Semantic node type. |
| `label` | yes | Display label. |
| `description` | no | Human-readable explanation. |
| `position` | yes | Absolute canvas position. |
| `size` | no | Node size. Renderer may use defaults. |
| `icon` | no | Namespaced icon ID. Omit it to use the node type default. |
| `ports` | no | Optional connection points. |
| `data` | no | Extension object for product-specific metadata. |

### Initial Node Types

```txt
user
browser
mobile
load_balancer
api
app
server
worker
database
cache
queue
storage
cdn
external_service
network
group
unknown
```

These are semantic types, not strict visual components. The renderer decides how each type appears.

### Node Icon IDs

New documents use namespaced icon IDs. The initial catalog vendors selected 24 px Material Symbols
Outlined paths and identifies them as `material-symbols:<name>`:

```txt
material-symbols:person          material-symbols:web
material-symbols:smartphone      material-symbols:devices
material-symbols:dns             material-symbols:api
material-symbols:deployed_code   material-symbols:memory
material-symbols:terminal        material-symbols:database
material-symbols:storage         material-symbols:hard_drive
material-symbols:cached          material-symbols:inventory_2
material-symbols:hub             material-symbols:router
material-symbols:lan             material-symbols:account_tree
material-symbols:public          material-symbols:language
material-symbols:key             material-symbols:lock
material-symbols:shield          material-symbols:security
material-symbols:cloud           material-symbols:cloud_queue
material-symbols:folder          material-symbols:sync_alt
material-symbols:send
```

Unqualified IDs from earlier documents, such as `user`, `browser`, `server`, and `database`, remain
supported through runtime aliases. An unknown string remains structurally valid and renders the
fallback icon, which lets a future host provide a custom library without making the document
unreadable. AI-generated and editor-created documents should use catalog IDs rather than inventing
custom names.

## Edge

Edges represent relationships or communication paths between nodes.

```json
{
  "id": "edge_browser_lb",
  "source": {
    "nodeId": "browser",
    "portId": "out"
  },
  "target": {
    "nodeId": "load_balancer",
    "portId": "in"
  },
  "label": "HTTPS",
  "direction": "forward",
  "style": {
    "line": "solid",
    "routing": "smooth",
    "color": "default",
    "labelPlacement": "above",
    "startMarker": "none",
    "endMarker": "arrow"
  },
  "data": {}
}
```

### Edge Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable edge identifier. |
| `source.nodeId` | yes | Source node ID. |
| `source.portId` | no | Source port ID. |
| `target.nodeId` | yes | Target node ID. |
| `target.portId` | no | Target port ID. |
| `label` | no | Display label. |
| `direction` | no | Direction semantics. |
| `style` | no | Static visual styling. |
| `data` | no | Extension object. |

### Edge Direction

```txt
none
forward
backward
bidirectional
```

Direction is semantic. It does not automatically mean the edge is animated.

### Edge Style

```json
{
  "line": "solid",
  "routing": "smooth",
  "color": "default",
  "labelPlacement": "above",
  "startMarker": "none",
  "endMarker": "arrow"
}
```

Initial values:

- `line`: `solid`, `dashed`, `dotted`
- `routing`: `straight`, `smooth`, `orthogonal`
- `color`: `default`, any semantic or palette color preset, or six-digit `#rrggbb` hex color
- `labelPlacement`: `center`, `above`, `below`
- `startMarker`: `none`, `arrow`, `triangle`, `circle`
- `endMarker`: `none`, `arrow`, `triangle`, `circle`

`labelPlacement` controls where the edge label is rendered:

- `center`: label is placed on the edge and may visually cover the line.
- `above`: label is offset above a horizontal edge. For vertical edges, it is offset to the right.
- `below`: label is offset below a horizontal edge. For vertical edges, it is offset to the left.

`startMarker` and `endMarker` control endpoint shapes independently. Input documents may omit them;
the canonical normalizer derives and stores both markers from `direction`.

Default value: `above`.

## Animation

Animations represent meaningful flow over existing edges.

```json
{
  "id": "anim_browser_lb_request",
  "type": "packet",
  "edgeIds": ["edge_browser_lb"],
  "enabled": true,
  "direction": "forward",
  "speed": 1,
  "loop": true,
  "label": "Request",
  "payload": {
    "kind": "request"
  }
}
```

### Animation Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable animation identifier. |
| `type` | yes | Animation type. |
| `edgeIds` | yes | Edges used by this animation. |
| `enabled` | yes | Whether animation is active. |
| `direction` | no | Flow direction. |
| `speed` | no | Relative speed. |
| `loop` | no | Whether animation repeats. |
| `label` | no | Display or editor label. |
| `payload` | no | Animation-specific data. |

### Initial Animation Types

```txt
packet
request
response
cache_hit
cache_miss
retry
broadcast
step_reveal
none
```

Animation is separate from edge structure.

```txt
Edge = connection
Animation = meaning over time
```

## Scene

Scenes describe step-by-step changes over the same diagram.

They do not replace nodes or edges. A scene selects active animations and can override node
labels, types, icons, positions, tones, and statuses, plus edge labels, styles, tones, and disabled
states for that step.

`animationIds` cannot contain duplicates. Each scene can contain at most one `nodeOverride` per
node and one `edgeOverride` per edge so that override precedence is never ambiguous.

New documents start with one `scene_default` scene. The `scenes` field remains optional so existing documents without scenes continue to be valid.

```json
{
  "id": "scene_open",
  "title": "Circuit Open",
  "description": "The order service stops calling payment and returns a fallback response.",
  "animationIds": ["anim_fallback_response"],
  "edgeOverrides": [
    {
      "edgeId": "edge_order_payment",
      "label": "Circuit open",
      "disabled": true,
      "tone": "muted"
    }
  ],
  "nodeOverrides": [
    {
      "nodeId": "payment_service",
      "label": "Payment Service (Unavailable)",
      "position": { "x": 720, "y": 280 },
      "tone": "muted"
    }
  ]
}
```

### Scene Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable scene identifier. |
| `title` | yes | Human-facing scene name. |
| `description` | no | Short explanation for viewer/editor UI. |
| `animationIds` | no | Animation IDs active in this scene. If omitted, all enabled animations are rendered. |
| `edgeOverrides` | no | Per-edge label, style, tone, or disabled-state changes. |
| `nodeOverrides` | no | Per-node label, type, icon, position, tone, or status changes. |

Initial scene tones:

```txt
normal
active
warning
danger
muted
```

Scenes are useful for explaining changing runtime behavior without duplicating the shared graph.
When a scene disables an edge, that edge is also excluded from active animations for the scene.

## Group

Groups organize nodes without becoming a freeform whiteboard feature.

```json
{
  "id": "backend",
  "label": "Backend",
  "nodeIds": ["load_balancer", "app_server", "database"],
  "style": {
    "variant": "boundary"
  }
}
```

Groups are optional. Group membership is defined only by `Group.nodeIds`. IDs cannot repeat within
a group, and a node can belong to at most one group. This keeps group bounds, movement, and future
group editing behavior deterministic. Canonical output stores `style.variant: "boundary"` when
group style is omitted.

## Complete MVP Example

```json
{
  "schemaVersion": "0.2",
  "id": "diagram_basic_web_architecture",
  "kind": "architecture",
  "metadata": {
    "title": "Basic Web Architecture",
    "description": "A browser sends traffic through a load balancer to an app server, database, and object storage.",
    "createdAt": "2026-07-08T00:00:00.000Z",
    "updatedAt": "2026-07-08T00:00:00.000Z",
    "tags": ["web", "architecture"]
  },
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  },
  "theme": {
    "mode": "light",
    "accent": "blue",
    "background": "#f8fafc"
  },
  "nodes": [
    {
      "id": "user",
      "type": "user",
      "label": "User",
      "position": { "x": 80, "y": 220 },
      "size": { "width": 120, "height": 72 },
      "icon": "material-symbols:person"
    },
    {
      "id": "browser",
      "type": "browser",
      "label": "Browser",
      "position": { "x": 280, "y": 220 },
      "size": { "width": 140, "height": 72 },
      "icon": "material-symbols:web"
    },
    {
      "id": "load_balancer",
      "type": "load_balancer",
      "label": "Load Balancer",
      "position": { "x": 500, "y": 220 },
      "size": { "width": 160, "height": 72 },
      "icon": "material-symbols:hub"
    },
    {
      "id": "app_server",
      "type": "app",
      "label": "App Server",
      "position": { "x": 740, "y": 160 },
      "size": { "width": 160, "height": 80 },
      "icon": "material-symbols:dns"
    },
    {
      "id": "database",
      "type": "database",
      "label": "Database",
      "position": { "x": 980, "y": 120 },
      "size": { "width": 160, "height": 80 },
      "icon": "material-symbols:database"
    },
    {
      "id": "storage",
      "type": "storage",
      "label": "Object Storage",
      "position": { "x": 980, "y": 280 },
      "size": { "width": 160, "height": 80 },
      "icon": "material-symbols:storage"
    }
  ],
  "edges": [
    {
      "id": "edge_user_browser",
      "source": { "nodeId": "user" },
      "target": { "nodeId": "browser" },
      "label": "Uses",
      "direction": "forward",
      "style": { "line": "solid", "routing": "smooth", "color": "muted" }
    },
    {
      "id": "edge_browser_lb",
      "source": { "nodeId": "browser" },
      "target": { "nodeId": "load_balancer" },
      "label": "HTTPS",
      "direction": "forward",
      "style": { "line": "solid", "routing": "smooth", "color": "accent", "labelPlacement": "above" }
    },
    {
      "id": "edge_lb_app",
      "source": { "nodeId": "load_balancer" },
      "target": { "nodeId": "app_server" },
      "label": "HTTP",
      "direction": "forward",
      "style": { "line": "solid", "routing": "smooth", "color": "accent" }
    },
    {
      "id": "edge_app_db",
      "source": { "nodeId": "app_server" },
      "target": { "nodeId": "database" },
      "label": "SQL",
      "direction": "bidirectional",
      "style": { "line": "solid", "routing": "smooth", "color": "default" }
    },
    {
      "id": "edge_app_storage",
      "source": { "nodeId": "app_server" },
      "target": { "nodeId": "storage" },
      "label": "Files",
      "direction": "bidirectional",
      "style": { "line": "dashed", "routing": "smooth", "color": "default" }
    }
  ],
  "groups": [
    {
      "id": "backend",
      "label": "Backend",
      "nodeIds": ["app_server"],
      "style": { "variant": "boundary" }
    },
    {
      "id": "data",
      "label": "Data Layer",
      "nodeIds": ["database", "storage"],
      "style": { "variant": "boundary" }
    }
  ],
  "animations": [
    {
      "id": "anim_request",
      "type": "packet",
      "edgeIds": ["edge_browser_lb", "edge_lb_app"],
      "enabled": true,
      "direction": "forward",
      "speed": 1,
      "loop": true,
      "label": "Request",
      "payload": {
        "kind": "request"
      }
    }
  ]
}
```

## Large Diagram Considerations

JSON remains acceptable for diagrams with 100 to 200 nodes if the schema follows these rules:

- Every node, edge, group, and animation has a stable ID.
- Edges reference node IDs, not array indexes.
- Renderer builds lookup maps internally.
- Layout and routing are computed outside the schema or stored as explicit coordinates.
- Version history should avoid storing a full snapshot for every small edit.

For large diagrams, the document can later add:

- `layers`
- collapsed groups
- viewport-based rendering
- edge bundles
- incremental patches
- spatial indexes in renderer memory

These should not be required for the first prototype.

## JSON vs JSONL

The current diagram state should be a single JSON document.

JSONL is better suited for events:

```jsonl
{"type":"node.add","nodeId":"api","node":{"type":"api","label":"API"}}
{"type":"node.move","nodeId":"api","position":{"x":400,"y":200}}
{"type":"edge.add","edgeId":"edge_browser_api","source":"browser","target":"api"}
{"type":"animation.update","id":"anim_request","edgeIds":["edge_browser_api"]}
```

Recommended separation:

```txt
Current diagram state      -> JSON
Renderer input             -> JSON
AI-generated draft         -> JSON
AI incremental edits       -> JSON Patch or JSONL events
Editor undo/redo           -> JSONL events or patches
Version history            -> snapshots + patches
```

## Open Questions

1. Should animations be embedded inside edges or kept as top-level entities?

   Current recommendation: keep animations top-level and reference edges by ID. This supports multi-edge flows such as request paths.

2. Should ports be required?

   Current recommendation: optional for MVP. Add them only when edge routing and manual connection editing need more precision.

3. Should groups be nodes?

   Current recommendation: keep groups separate for MVP. A group is an organization boundary, not a real architecture component.

4. Should layout be generated by AI or by an algorithm?

   Current recommendation: AI may suggest positions, but the renderer should treat positions as explicit data. Later, an AI layout action can update positions.

5. Should the schema allow custom node types?

   Current recommendation: allow `unknown` and `data`, but keep known node types constrained for better rendering quality.

## Next Step

The next practical step is to define this draft as TypeScript types and a runtime validator.

Recommended stack:

```txt
TypeScript types
Zod schema
sample diagram JSON
deterministic renderer prototype
```
