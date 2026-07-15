import { z } from "zod";

export const CURRENT_DIAGRAM_SCHEMA_VERSION = "0.2" as const;
export const SUPPORTED_DIAGRAM_SCHEMA_VERSIONS = [CURRENT_DIAGRAM_SCHEMA_VERSION] as const;

export type DiagramSchemaVersion = typeof SUPPORTED_DIAGRAM_SCHEMA_VERSIONS[number];

export const idSchema = z.string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
  .describe("Stable identifier beginning with a letter and containing only letters, digits, underscores, or hyphens.");

export const SEMANTIC_COLOR_PRESETS = [
  "accent",
  "primary",
  "muted",
  "neutral",
  "success",
  "warning",
  "danger",
  "info",
] as const;

export const PALETTE_COLOR_PRESETS = [
  "blue",
  "green",
  "amber",
  "red",
  "violet",
  "slate",
] as const;

export const EDGE_COLOR_PRESETS = [
  "default",
  ...SEMANTIC_COLOR_PRESETS,
  ...PALETTE_COLOR_PRESETS,
] as const;

export const semanticColorPresetSchema = z.enum(SEMANTIC_COLOR_PRESETS);

export const paletteColorPresetSchema = z.enum(PALETTE_COLOR_PRESETS);

export const colorPresetSchema = z.union([
  semanticColorPresetSchema,
  paletteColorPresetSchema,
]);

export const edgeColorPresetSchema = z.enum(EDGE_COLOR_PRESETS);

export const hexColorSchema = z.string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .describe("Six-digit hex color in #rrggbb form.");

export const diagramColorSchema = z.union([
  colorPresetSchema,
  hexColorSchema,
]).describe("Color preset token or six-digit #rrggbb hex color.");

export const edgeColorSchema = z.union([
  edgeColorPresetSchema,
  hexColorSchema,
]).describe("Edge color preset token or six-digit #rrggbb hex color.");

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
  icon: z.string().optional().describe(
    "Optional namespaced icon ID such as material-symbols:database; legacy names and unsupported custom strings remain readable with runtime fallback behavior.",
  ),
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
  line: edgeLineSchema.default("solid").describe("Line pattern; defaults to solid."),
  routing: edgeRoutingSchema.default("smooth").describe("Path routing mode; defaults to smooth."),
  color: edgeColorSchema.default("default").describe(
    "Runtime edge color preset or six-digit #rrggbb hex color; defaults to default.",
  ),
  labelPlacement: edgeLabelPlacementSchema.default("above")
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
    .default("forward").describe("Semantic edge direction; defaults to forward."),
  style: edgeStyleSchema.default({}).describe("Static visual styling with canonical defaults."),
  data: z.record(z.string(), z.unknown()).optional()
    .describe("Extension data ignored by the core schema."),
}).strict().describe("A connection or communication path between two nodes.");

export const groupSchema = z.object({
  id: idSchema.describe("Unique group identifier."),
  label: z.string().min(1).describe("Human-readable group label."),
  nodeIds: z.array(idSchema)
    .describe("Unique node identifiers owned by this group; a node can belong to only one group."),
  style: z
    .object({
      variant: z.enum(["boundary", "lane", "none"]).default("boundary")
        .describe("Group rendering variant; defaults to boundary."),
    }).strict()
    .default({})
    .describe("Group styling with canonical defaults."),
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
  edgeIds: z.array(idSchema).min(1)
    .describe("Ordered unique edge identifiers included in this animation."),
  enabled: z.boolean().describe("Whether the animation can be rendered."),
  direction: z.enum(["forward", "backward", "bidirectional"])
    .default("forward").describe("Playback direction; defaults to forward."),
  speed: z.number().positive().default(1).describe("Positive playback speed multiplier; defaults to 1."),
  loop: z.boolean().default(true).describe("Whether playback repeats; defaults to true."),
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
    .describe("Unique animations active in this scene; all enabled animations are active when omitted."),
  edgeOverrides: z.array(sceneEdgeOverrideSchema).optional()
    .describe("Scene-specific edge changes with at most one override per edge."),
  nodeOverrides: z.array(sceneNodeOverrideSchema).optional()
    .describe("Scene-specific node changes with at most one override per node."),
}).strict().describe("One scenario step over the shared diagram structure.");

export const diagramDocumentSchema = z.object({
  schemaVersion: z.literal(CURRENT_DIAGRAM_SCHEMA_VERSION).describe("Diagram JSON contract version."),
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
    accent: diagramColorSchema.describe("Accent color preset or six-digit #rrggbb hex color."),
    background: hexColorSchema.describe("Diagram background color as a six-digit #rrggbb hex color."),
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

export type UnsupportedDiagramVersionReason = "missing" | "invalid" | "older" | "newer" | "unsupported";

export class UnsupportedDiagramVersionError extends Error {
  readonly schemaVersion: unknown;
  readonly targetVersion: DiagramSchemaVersion;
  readonly currentVersion: DiagramSchemaVersion;
  readonly reason: UnsupportedDiagramVersionReason;

  constructor({
    schemaVersion,
    targetVersion,
    currentVersion = CURRENT_DIAGRAM_SCHEMA_VERSION,
    reason,
  }: {
    schemaVersion: unknown;
    targetVersion: DiagramSchemaVersion;
    currentVersion?: DiagramSchemaVersion;
    reason: UnsupportedDiagramVersionReason;
  }) {
    super(formatUnsupportedDiagramVersionMessage(schemaVersion, targetVersion, currentVersion, reason));
    this.name = "UnsupportedDiagramVersionError";
    this.schemaVersion = schemaVersion;
    this.targetVersion = targetVersion;
    this.currentVersion = currentVersion;
    this.reason = reason;
  }
}

type DiagramMigration = (input: unknown) => unknown;
type DiagramMigrationKey = `${string}->${string}`;

const diagramMigrationRegistry = new Map<DiagramMigrationKey, DiagramMigration>();

export function migrateDiagramDocument(
  input: unknown,
  targetVersion: DiagramSchemaVersion = CURRENT_DIAGRAM_SCHEMA_VERSION,
): unknown {
  const sourceVersion = readDiagramSchemaVersion(input);
  if (sourceVersion === targetVersion) return input;

  const migration = diagramMigrationRegistry.get(getMigrationKey(sourceVersion, targetVersion));
  if (migration) return migration(input);

  throw new UnsupportedDiagramVersionError({
    schemaVersion: sourceVersion,
    targetVersion,
    reason: getUnsupportedVersionReason(sourceVersion, targetVersion),
  });
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

  const nodeGroupOwners = new Map<string, { groupId: string; groupIndex: number }>();
  (diagram.groups ?? []).forEach((group, groupIndex) => {
    validateUniqueValues(
      group.nodeIds,
      ["groups", groupIndex, "nodeIds"],
      "node reference",
      issues,
    );
    group.nodeIds.forEach((nodeId, nodeIdIndex) => {
      const path = ["groups", groupIndex, "nodeIds", nodeIdIndex];
      requireReference(
        nodeIds,
        nodeId,
        path,
        "node",
        issues,
      );
      if (!nodeIds.has(nodeId)) return;

      const owner = nodeGroupOwners.get(nodeId);
      if (owner && owner.groupIndex !== groupIndex) {
        issues.push({
          path,
          message: `Node '${nodeId}' belongs to multiple groups ('${owner.groupId}' and '${group.id}')`,
        });
      } else if (!owner) {
        nodeGroupOwners.set(nodeId, { groupId: group.id, groupIndex });
      }
    });
  });

  (diagram.animations ?? []).forEach((animation, animationIndex) => {
    validateUniqueValues(
      animation.edgeIds,
      ["animations", animationIndex, "edgeIds"],
      "edge reference",
      issues,
    );
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
    validateUniqueValues(
      scene.animationIds ?? [],
      ["scenes", sceneIndex, "animationIds"],
      "animation reference",
      issues,
    );
    scene.animationIds?.forEach((animationId, animationIdIndex) => {
      requireReference(
        animationIds,
        animationId,
        ["scenes", sceneIndex, "animationIds", animationIdIndex],
        "animation",
        issues,
      );
    });
    validateUniqueValues(
      scene.nodeOverrides?.map((override) => override.nodeId) ?? [],
      ["scenes", sceneIndex, "nodeOverrides"],
      "node override",
      issues,
      "nodeId",
    );
    scene.nodeOverrides?.forEach((override, overrideIndex) => {
      requireReference(
        nodeIds,
        override.nodeId,
        ["scenes", sceneIndex, "nodeOverrides", overrideIndex, "nodeId"],
        "node",
        issues,
      );
    });
    validateUniqueValues(
      scene.edgeOverrides?.map((override) => override.edgeId) ?? [],
      ["scenes", sceneIndex, "edgeOverrides"],
      "edge override",
      issues,
      "edgeId",
    );
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

export function normalizeDiagramDocument(value: unknown): DiagramDocument {
  const migrated = migrateDiagramDocument(value, CURRENT_DIAGRAM_SCHEMA_VERSION);
  const parsed = diagramDocumentSchema.parse(migrated);
  const diagram: DiagramDocument = {
    ...parsed,
    edges: parsed.edges.map((edge) => ({
      ...edge,
      style: {
        line: edge.style.line,
        routing: edge.style.routing,
        color: edge.style.color,
        labelPlacement: edge.style.labelPlacement,
        startMarker: edge.style.startMarker ?? resolveEdgeStartMarker(edge),
        endMarker: edge.style.endMarker ?? resolveEdgeEndMarker(edge),
      },
    })),
  };
  assertValidDiagramDocument(diagram);
  return diagram;
}

export function parseDiagramDocument(value: unknown): DiagramDocument {
  return normalizeDiagramDocument(value);
}

export function serializeDiagramDocument(value: unknown): string {
  return `${JSON.stringify(normalizeDiagramDocument(value), null, 2)}\n`;
}

function readDiagramSchemaVersion(input: unknown): string {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new UnsupportedDiagramVersionError({
      schemaVersion: undefined,
      targetVersion: CURRENT_DIAGRAM_SCHEMA_VERSION,
      reason: "missing",
    });
  }

  const schemaVersion = (input as { schemaVersion?: unknown }).schemaVersion;
  if (schemaVersion === undefined) {
    throw new UnsupportedDiagramVersionError({
      schemaVersion,
      targetVersion: CURRENT_DIAGRAM_SCHEMA_VERSION,
      reason: "missing",
    });
  }

  if (typeof schemaVersion !== "string" || schemaVersion.trim() === "") {
    throw new UnsupportedDiagramVersionError({
      schemaVersion,
      targetVersion: CURRENT_DIAGRAM_SCHEMA_VERSION,
      reason: "invalid",
    });
  }

  return schemaVersion;
}

function getMigrationKey(sourceVersion: string, targetVersion: string): DiagramMigrationKey {
  return `${sourceVersion}->${targetVersion}`;
}

function getUnsupportedVersionReason(
  sourceVersion: string,
  targetVersion: DiagramSchemaVersion,
): UnsupportedDiagramVersionReason {
  if (!parseVersionParts(sourceVersion) || !parseVersionParts(targetVersion)) return "unsupported";
  const ordering = compareDiagramSchemaVersions(sourceVersion, targetVersion);
  if (ordering < 0) return "older";
  if (ordering > 0) return "newer";
  return "unsupported";
}

function compareDiagramSchemaVersions(left: string, right: string): number {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  if (!leftParts || !rightParts) return left.localeCompare(right);

  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart !== rightPart) return leftPart - rightPart;
  }
  return 0;
}

function parseVersionParts(version: string): number[] | null {
  if (!/^\d+(?:\.\d+)*$/.test(version)) return null;
  return version.split(".").map((part) => Number(part));
}

function formatUnsupportedDiagramVersionMessage(
  schemaVersion: unknown,
  targetVersion: DiagramSchemaVersion,
  currentVersion: DiagramSchemaVersion,
  reason: UnsupportedDiagramVersionReason,
): string {
  const supportedVersions = SUPPORTED_DIAGRAM_SCHEMA_VERSIONS.join(", ");
  if (reason === "missing") {
    return `Diagram JSON is missing schemaVersion. Supported schemaVersion: ${supportedVersions}.`;
  }
  if (reason === "invalid") {
    return `Diagram JSON has an invalid schemaVersion. Expected a non-empty string supported by this app.`;
  }
  if (reason === "older") {
    return `Diagram JSON schemaVersion ${String(schemaVersion)} is older than the current schemaVersion ${currentVersion}. No migration path to ${targetVersion} is available yet.`;
  }
  if (reason === "newer") {
    return `Diagram JSON schemaVersion ${String(schemaVersion)} is newer than the current schemaVersion ${currentVersion}. Please open it with a newer DiaFlow version.`;
  }
  return `Diagram JSON schemaVersion ${String(schemaVersion)} is not supported. Supported schemaVersion: ${supportedVersions}.`;
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

function validateUniqueValues(
  values: readonly string[],
  path: Array<string | number>,
  duplicateLabel: string,
  issues: DiagramIntegrityIssue[],
  idField?: string,
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      issues.push({
        path: idField ? [...path, index, idField] : [...path, index],
        message: `Duplicate ${duplicateLabel} '${value}'`,
      });
    }
    seen.add(value);
  });
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
