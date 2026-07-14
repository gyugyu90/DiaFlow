import { z } from "zod";

export const idSchema = z.string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
  .describe("Stable identifier beginning with a letter and containing only letters, digits, underscores, or hyphens.");

export const nodeTypeSchema = z.enum([
  "user",
  "browser",
  "mobile",
  "load_balancer",
  "api",
  "app",
  "server",
  "worker",
  "database",
  "cache",
  "queue",
  "storage",
  "cdn",
  "external_service",
  "network",
  "group",
  "unknown",
]);

export const pointSchema = z.object({
  x: z.number().describe("Horizontal canvas coordinate in diagram units."),
  y: z.number().describe("Vertical canvas coordinate in diagram units."),
}).strict().describe("Absolute point in the diagram coordinate system.");

export const sizeSchema = z.object({
  width: z.number().positive().describe("Positive width in diagram units."),
  height: z.number().positive().describe("Positive height in diagram units."),
}).strict().describe("Explicit rendered size of a diagram element.");

export const nodeSchema = z.object({
  id: idSchema.describe("Unique node identifier referenced by edges, groups, and scenes."),
  type: nodeTypeSchema.describe("Semantic architecture component type."),
  label: z.string().min(1).describe("Human-readable node label."),
  description: z.string().optional().describe("Optional explanation of the node's role."),
  position: pointSchema.describe("Absolute top-left node position on the canvas."),
  size: sizeSchema.optional().describe("Optional node size; the runtime uses its default size when omitted."),
  icon: z.string().optional().describe("Optional icon name understood by the runtime."),
  ports: z
    .array(
      z.object({
        id: idSchema.describe("Port identifier unique within this node."),
        side: z.enum(["top", "right", "bottom", "left"])
          .describe("Node side where the port is rendered."),
      }).strict(),
    )
    .optional()
    .describe("Optional named connection points."),
  data: z.record(z.string(), z.unknown()).optional()
    .describe("Extension data ignored by the core schema."),
}).strict().describe("A component or participant in the diagram.");

export const edgeMarkerSchema = z.enum(["none", "arrow", "triangle", "circle"]);
export const edgeLineSchema = z.enum(["solid", "dashed", "dotted"]);
export const edgeRoutingSchema = z.enum(["straight", "smooth", "orthogonal"]);
export const edgeLabelPlacementSchema = z.enum(["center", "above", "below"]);

export const edgeStyleSchema = z.object({
  line: edgeLineSchema.default("solid").optional().describe("Line pattern; defaults to solid."),
  routing: edgeRoutingSchema.default("smooth").optional().describe("Path routing mode; defaults to smooth."),
  color: z.string().default("default").optional().describe("Runtime color preset or CSS color; defaults to default."),
  labelPlacement: edgeLabelPlacementSchema.default("above").optional()
    .describe("Label position relative to the edge; defaults to above."),
  startMarker: edgeMarkerSchema.optional().describe("Optional marker at the source endpoint."),
  endMarker: edgeMarkerSchema.optional().describe("Optional marker at the target endpoint."),
}).strict().describe("Static visual styling for an edge.");

export const sceneToneSchema = z.enum(["normal", "active", "warning", "danger", "muted"]);

export const endpointSchema = z.object({
  nodeId: idSchema.describe("Referenced node identifier."),
  portId: idSchema.optional().describe("Optional port identifier on the referenced node."),
}).strict().describe("One endpoint of an edge.");

export const edgeSchema = z.object({
  id: idSchema.describe("Unique edge identifier referenced by animations and scenes."),
  source: endpointSchema.describe("Source endpoint."),
  target: endpointSchema.describe("Target endpoint."),
  label: z.string().optional().describe("Optional relationship or protocol label."),
  direction: z.enum(["none", "forward", "backward", "bidirectional"])
    .default("forward").optional().describe("Semantic edge direction; defaults to forward."),
  style: edgeStyleSchema.optional().describe("Optional static visual styling."),
  data: z.record(z.string(), z.unknown()).optional()
    .describe("Extension data ignored by the core schema."),
}).strict().describe("A connection or communication path between two nodes.");

export const groupSchema = z.object({
  id: idSchema.describe("Unique group identifier."),
  label: z.string().min(1).describe("Human-readable group label."),
  nodeIds: z.array(idSchema).describe("Node identifiers owned by this group membership."),
  style: z
    .object({
      variant: z.enum(["boundary", "lane", "none"]).default("boundary").optional()
        .describe("Group rendering variant; defaults to boundary."),
    }).strict()
    .optional()
    .describe("Optional group styling."),
}).strict().describe("A visual grouping that owns its node membership through nodeIds.");

export const animationSchema = z.object({
  id: idSchema.describe("Unique animation identifier referenced by scenes."),
  type: z.enum([
    "packet",
    "request",
    "response",
    "cache_hit",
    "cache_miss",
    "retry",
    "broadcast",
    "step_reveal",
    "none",
  ]).describe("Semantic meaning of the animated flow."),
  edgeIds: z.array(idSchema).min(1).describe("Ordered edge identifiers included in this animation."),
  enabled: z.boolean().describe("Whether the animation can be rendered."),
  direction: z.enum(["forward", "backward", "bidirectional"])
    .default("forward").optional().describe("Playback direction; defaults to forward."),
  speed: z.number().positive().default(1).optional().describe("Positive playback speed multiplier; defaults to 1."),
  loop: z.boolean().default(true).optional().describe("Whether playback repeats; defaults to true."),
  label: z.string().optional().describe("Optional human-readable animation label."),
  payload: z.record(z.string(), z.unknown()).optional()
    .describe("Optional semantic payload carried by the flow."),
}).strict().describe("A flow animation that owns its edge membership through edgeIds.");

export const sceneEdgeOverrideSchema = z.object({
  edgeId: idSchema.describe("Edge identifier affected in this scene."),
  label: z.string().optional().describe("Scene-specific edge label."),
  disabled: z.boolean().optional().describe("Whether the edge is disabled in this scene."),
  tone: sceneToneSchema.optional().describe("Scene-specific semantic edge tone."),
  style: edgeStyleSchema.partial().optional().describe("Scene-specific partial edge style."),
}).strict().describe("Scene-specific changes applied to one edge.");

export const sceneNodeOverrideSchema = z.object({
  nodeId: idSchema.describe("Node identifier affected in this scene."),
  tone: sceneToneSchema.optional().describe("Scene-specific semantic node tone."),
  status: z.string().optional().describe("Optional scene-specific node status text."),
}).strict().describe("Scene-specific changes applied to one node.");

export const sceneSchema = z.object({
  id: idSchema.describe("Unique scene identifier."),
  title: z.string().min(1).describe("Human-readable scene title."),
  description: z.string().optional().describe("Optional explanation of the scenario step."),
  animationIds: z.array(idSchema).optional()
    .describe("Animations active in this scene; all enabled animations are active when omitted."),
  edgeOverrides: z.array(sceneEdgeOverrideSchema).optional()
    .describe("Scene-specific edge changes."),
  nodeOverrides: z.array(sceneNodeOverrideSchema).optional()
    .describe("Scene-specific node changes."),
}).strict().describe("One scenario step over the shared diagram structure.");

export const diagramDocumentSchema = z.object({
  schemaVersion: z.literal("0.2").describe("Diagram JSON contract version."),
  id: idSchema.describe("Unique diagram document identifier."),
  kind: z.literal("architecture").describe("Diagram vertical supported by this schema version."),
  metadata: z.object({
    title: z.string().min(1).describe("Human-readable diagram title."),
    description: z.string().optional().describe("Optional diagram summary."),
    createdAt: z.string().datetime().optional().describe("Optional ISO 8601 creation timestamp."),
    updatedAt: z.string().datetime().optional().describe("Optional ISO 8601 last-update timestamp."),
    tags: z.array(z.string()).optional().describe("Optional search and classification tags."),
  }).strict().describe("Human-facing diagram metadata."),
  viewport: z.object({
    x: z.number().describe("Initial horizontal canvas translation."),
    y: z.number().describe("Initial vertical canvas translation."),
    zoom: z.number().positive().describe("Initial positive zoom scale."),
  }).strict().describe("Initial viewer camera state."),
  theme: z.object({
    mode: z.enum(["light", "dark"]).describe("Base light or dark appearance."),
    accent: z.string().describe("Accent color preset or CSS color."),
    background: z.string().describe("Diagram background color."),
  }).strict().describe("Document-level visual theme."),
  nodes: z.array(nodeSchema).describe("All nodes in the diagram."),
  edges: z.array(edgeSchema).describe("All edges in the diagram."),
  groups: z.array(groupSchema).optional().describe("Optional visual node groups."),
  animations: z.array(animationSchema).optional().describe("Optional flow animations."),
  scenes: z.array(sceneSchema).optional().describe("Optional ordered scenario steps."),
}).strict().describe("Source-of-truth document for a DiaFlow interactive architecture diagram.");

export type DiagramDocument = z.infer<typeof diagramDocumentSchema>;
export type DiagramNode = z.infer<typeof nodeSchema>;
export type DiagramEdge = z.infer<typeof edgeSchema>;
export type DiagramGroup = z.infer<typeof groupSchema>;
export type DiagramAnimation = z.infer<typeof animationSchema>;
export type DiagramScene = z.infer<typeof sceneSchema>;
export type DiagramSceneEdgeOverride = z.infer<typeof sceneEdgeOverrideSchema>;
export type DiagramSceneNodeOverride = z.infer<typeof sceneNodeOverrideSchema>;
export type EdgeLabelPlacement = NonNullable<DiagramEdge["style"]>["labelPlacement"];
export type EdgeMarker = z.infer<typeof edgeMarkerSchema>;

export function resolveEdgeStartMarker(edge: DiagramEdge): EdgeMarker {
  if (edge.style?.startMarker !== undefined) return edge.style.startMarker;
  return edge.direction === "backward" || edge.direction === "bidirectional" ? "arrow" : "none";
}

export function resolveEdgeEndMarker(edge: DiagramEdge): EdgeMarker {
  if (edge.style?.endMarker !== undefined) return edge.style.endMarker;
  return edge.direction === "forward" || edge.direction === "bidirectional" ? "arrow" : "none";
}

export type DiagramIntegrityIssue = {
  path: Array<string | number>;
  message: string;
};

export class DiagramIntegrityError extends Error {
  readonly issues: DiagramIntegrityIssue[];

  constructor(issues: DiagramIntegrityIssue[]) {
    super(issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
    this.name = "DiagramIntegrityError";
    this.issues = issues;
  }
}

export function validateDiagramIntegrity(diagram: DiagramDocument): DiagramIntegrityIssue[] {
  const issues: DiagramIntegrityIssue[] = [];
  const nodeIds = collectIds(diagram.nodes, "nodes", issues);
  const edgeIds = collectIds(diagram.edges, "edges", issues);
  collectIds(diagram.groups ?? [], "groups", issues);
  const animationIds = collectIds(diagram.animations ?? [], "animations", issues);
  collectIds(diagram.scenes ?? [], "scenes", issues);

  diagram.nodes.forEach((node, nodeIndex) => {
    const portIds = new Set<string>();
    node.ports?.forEach((port, portIndex) => {
      if (portIds.has(port.id)) {
        issues.push({
          path: ["nodes", nodeIndex, "ports", portIndex, "id"],
          message: `Duplicate port id '${port.id}' on node '${node.id}'`,
        });
      }
      portIds.add(port.id);
    });
  });

  diagram.edges.forEach((edge, edgeIndex) => {
    validateEndpoint(diagram, nodeIds, edge.source, ["edges", edgeIndex, "source"], issues);
    validateEndpoint(diagram, nodeIds, edge.target, ["edges", edgeIndex, "target"], issues);
  });

  (diagram.groups ?? []).forEach((group, groupIndex) => {
    group.nodeIds.forEach((nodeId, nodeIdIndex) => {
      requireReference(
        nodeIds,
        nodeId,
        ["groups", groupIndex, "nodeIds", nodeIdIndex],
        "node",
        issues,
      );
    });
  });

  (diagram.animations ?? []).forEach((animation, animationIndex) => {
    animation.edgeIds.forEach((edgeId, edgeIdIndex) => {
      requireReference(
        edgeIds,
        edgeId,
        ["animations", animationIndex, "edgeIds", edgeIdIndex],
        "edge",
        issues,
      );
    });
  });

  (diagram.scenes ?? []).forEach((scene, sceneIndex) => {
    scene.animationIds?.forEach((animationId, animationIdIndex) => {
      requireReference(
        animationIds,
        animationId,
        ["scenes", sceneIndex, "animationIds", animationIdIndex],
        "animation",
        issues,
      );
    });
    scene.nodeOverrides?.forEach((override, overrideIndex) => {
      requireReference(
        nodeIds,
        override.nodeId,
        ["scenes", sceneIndex, "nodeOverrides", overrideIndex, "nodeId"],
        "node",
        issues,
      );
    });
    scene.edgeOverrides?.forEach((override, overrideIndex) => {
      requireReference(
        edgeIds,
        override.edgeId,
        ["scenes", sceneIndex, "edgeOverrides", overrideIndex, "edgeId"],
        "edge",
        issues,
      );
    });
  });

  return issues;
}

export function assertValidDiagramDocument(diagram: DiagramDocument): void {
  const issues = validateDiagramIntegrity(diagram);
  if (issues.length > 0) throw new DiagramIntegrityError(issues);
}

export function parseDiagramDocument(value: unknown): DiagramDocument {
  const diagram = diagramDocumentSchema.parse(value);
  assertValidDiagramDocument(diagram);
  return diagram;
}

function collectIds(
  items: Array<{ id: string }>,
  collection: string,
  issues: DiagramIntegrityIssue[],
): Set<string> {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    if (ids.has(item.id)) {
      issues.push({ path: [collection, index, "id"], message: `Duplicate ${collection} id '${item.id}'` });
    }
    ids.add(item.id);
  });
  return ids;
}

function requireReference(
  ids: Set<string>,
  id: string,
  path: Array<string | number>,
  kind: string,
  issues: DiagramIntegrityIssue[],
): void {
  if (!ids.has(id)) issues.push({ path, message: `Unknown ${kind} id '${id}'` });
}

function validateEndpoint(
  diagram: DiagramDocument,
  nodeIds: Set<string>,
  endpoint: DiagramEdge["source"],
  path: Array<string | number>,
  issues: DiagramIntegrityIssue[],
): void {
  requireReference(nodeIds, endpoint.nodeId, [...path, "nodeId"], "node", issues);
  if (!endpoint.portId) return;

  const node = diagram.nodes.find((candidate) => candidate.id === endpoint.nodeId);
  if (node && !node.ports?.some((port) => port.id === endpoint.portId)) {
    issues.push({
      path: [...path, "portId"],
      message: `Unknown port id '${endpoint.portId}' on node '${endpoint.nodeId}'`,
    });
  }
}
