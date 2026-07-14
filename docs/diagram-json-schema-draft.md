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
  "schemaVersion": "0.1",
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
"schemaVersion": "0.1"
```

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
  "icon": "server",
  "groupId": "backend",
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
| `icon` | no | Icon hint. |
| `groupId` | no | Parent group identifier. |
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
  "animationId": "anim_browser_lb_request",
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
| `animationId` | no | Linked animation definition. |
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
- `color`: `default`, `muted`, `accent`, or hex color
- `labelPlacement`: `center`, `above`, `below`
- `startMarker`: `none`, `arrow`, `triangle`, `circle`
- `endMarker`: `none`, `arrow`, `triangle`, `circle`

`labelPlacement` controls where the edge label is rendered:

- `center`: label is placed on the edge and may visually cover the line.
- `above`: label is offset above a horizontal edge. For vertical edges, it is offset to the right.
- `below`: label is offset below a horizontal edge. For vertical edges, it is offset to the left.

`startMarker` and `endMarker` control endpoint shapes independently. When they are omitted,
the renderer derives arrow markers from `direction` for backward compatibility.

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

They do not replace nodes or edges. A scene selects active animations and can override edge labels, edge style, edge tone, node tone, or disabled state for that step.

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
      "tone": "muted",
      "animationId": null
    }
  ],
  "nodeOverrides": [
    {
      "nodeId": "payment_service",
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
| `edgeOverrides` | no | Per-edge label, style, tone, animation, or disabled-state changes. |
| `nodeOverrides` | no | Per-node visual tone or status changes. |

Initial scene tones:

```txt
normal
active
warning
danger
muted
```

Scenes are useful for explaining changing runtime behavior without moving the architecture itself.

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

Groups are optional. Nodes can reference groups with `groupId`, and groups can list node IDs. The renderer should tolerate either representation.

## Complete MVP Example

```json
{
  "schemaVersion": "0.1",
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
      "icon": "user"
    },
    {
      "id": "browser",
      "type": "browser",
      "label": "Browser",
      "position": { "x": 280, "y": 220 },
      "size": { "width": 140, "height": 72 },
      "icon": "browser"
    },
    {
      "id": "load_balancer",
      "type": "load_balancer",
      "label": "Load Balancer",
      "position": { "x": 500, "y": 220 },
      "size": { "width": 160, "height": 72 },
      "icon": "network"
    },
    {
      "id": "app_server",
      "type": "app",
      "label": "App Server",
      "position": { "x": 740, "y": 160 },
      "size": { "width": 160, "height": 80 },
      "icon": "server",
      "groupId": "backend"
    },
    {
      "id": "database",
      "type": "database",
      "label": "Database",
      "position": { "x": 980, "y": 120 },
      "size": { "width": 160, "height": 80 },
      "icon": "database",
      "groupId": "data"
    },
    {
      "id": "storage",
      "type": "storage",
      "label": "Object Storage",
      "position": { "x": 980, "y": 280 },
      "size": { "width": 160, "height": 80 },
      "icon": "storage",
      "groupId": "data"
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
      "style": { "line": "solid", "routing": "smooth", "color": "accent", "labelPlacement": "above" },
      "animationId": "anim_request"
    },
    {
      "id": "edge_lb_app",
      "source": { "nodeId": "load_balancer" },
      "target": { "nodeId": "app_server" },
      "label": "HTTP",
      "direction": "forward",
      "style": { "line": "solid", "routing": "smooth", "color": "accent" },
      "animationId": "anim_request"
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
{"type":"animation.set","edgeId":"edge_browser_api","animationId":"anim_request"}
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
