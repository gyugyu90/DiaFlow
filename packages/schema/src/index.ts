import { z } from "zod";

export const idSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/);

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
  x: z.number(),
  y: z.number(),
});

export const sizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

export const nodeSchema = z.object({
  id: idSchema,
  type: nodeTypeSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  position: pointSchema,
  size: sizeSchema.optional(),
  icon: z.string().optional(),
  groupId: idSchema.optional(),
  ports: z
    .array(
      z.object({
        id: idSchema,
        side: z.enum(["top", "right", "bottom", "left"]),
      }),
    )
    .optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const edgeMarkerSchema = z.enum(["none", "arrow", "triangle", "circle"]);
export const edgeLineSchema = z.enum(["solid", "dashed", "dotted"]);
export const edgeRoutingSchema = z.enum(["straight", "smooth", "orthogonal"]);
export const edgeLabelPlacementSchema = z.enum(["center", "above", "below"]);

export const edgeStyleSchema = z.object({
  line: edgeLineSchema.default("solid").optional(),
  routing: edgeRoutingSchema.default("smooth").optional(),
  color: z.string().default("default").optional(),
  labelPlacement: edgeLabelPlacementSchema.default("above").optional(),
  startMarker: edgeMarkerSchema.optional(),
  endMarker: edgeMarkerSchema.optional(),
});

export const sceneToneSchema = z.enum(["normal", "active", "warning", "danger", "muted"]);

export const endpointSchema = z.object({
  nodeId: idSchema,
  portId: idSchema.optional(),
});

export const edgeSchema = z.object({
  id: idSchema,
  source: endpointSchema,
  target: endpointSchema,
  label: z.string().optional(),
  direction: z.enum(["none", "forward", "backward", "bidirectional"]).default("forward").optional(),
  style: edgeStyleSchema.optional(),
  animationId: idSchema.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const groupSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  nodeIds: z.array(idSchema),
  style: z
    .object({
      variant: z.enum(["boundary", "lane", "none"]).default("boundary").optional(),
    })
    .optional(),
});

export const animationSchema = z.object({
  id: idSchema,
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
  ]),
  edgeIds: z.array(idSchema).min(1),
  enabled: z.boolean(),
  direction: z.enum(["forward", "backward", "bidirectional"]).default("forward").optional(),
  speed: z.number().positive().default(1).optional(),
  loop: z.boolean().default(true).optional(),
  label: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const sceneEdgeOverrideSchema = z.object({
  edgeId: idSchema,
  label: z.string().optional(),
  disabled: z.boolean().optional(),
  animationId: idSchema.nullable().optional(),
  tone: sceneToneSchema.optional(),
  style: edgeStyleSchema.partial().optional(),
});

export const sceneNodeOverrideSchema = z.object({
  nodeId: idSchema,
  tone: sceneToneSchema.optional(),
  status: z.string().optional(),
});

export const sceneSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  animationIds: z.array(idSchema).optional(),
  edgeOverrides: z.array(sceneEdgeOverrideSchema).optional(),
  nodeOverrides: z.array(sceneNodeOverrideSchema).optional(),
});

export const diagramDocumentSchema = z.object({
  schemaVersion: z.literal("0.1"),
  id: idSchema,
  kind: z.literal("architecture"),
  metadata: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number().positive(),
  }),
  theme: z.object({
    mode: z.enum(["light", "dark"]),
    accent: z.string(),
    background: z.string(),
  }),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
  groups: z.array(groupSchema).optional(),
  animations: z.array(animationSchema).optional(),
  scenes: z.array(sceneSchema).optional(),
});

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
  const groupIds = collectIds(diagram.groups ?? [], "groups", issues);
  const animationIds = collectIds(diagram.animations ?? [], "animations", issues);
  collectIds(diagram.scenes ?? [], "scenes", issues);

  diagram.nodes.forEach((node, nodeIndex) => {
    if (node.groupId) {
      requireReference(groupIds, node.groupId, ["nodes", nodeIndex, "groupId"], "group", issues);
    }
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
    if (edge.animationId) {
      requireReference(
        animationIds,
        edge.animationId,
        ["edges", edgeIndex, "animationId"],
        "animation",
        issues,
      );
    }
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
      if (override.animationId) {
        requireReference(
          animationIds,
          override.animationId,
          ["scenes", sceneIndex, "edgeOverrides", overrideIndex, "animationId"],
          "animation",
          issues,
        );
      }
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
