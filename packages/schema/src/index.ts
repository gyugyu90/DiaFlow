import { z } from "zod";

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
  id: z.string().min(1),
  type: nodeTypeSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  position: pointSchema,
  size: sizeSchema.optional(),
  icon: z.string().optional(),
  groupId: z.string().optional(),
  ports: z
    .array(
      z.object({
        id: z.string().min(1),
        side: z.enum(["top", "right", "bottom", "left"]),
      }),
    )
    .optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const edgeStyleSchema = z.object({
  line: z.enum(["solid", "dashed", "dotted"]).default("solid").optional(),
  routing: z.enum(["straight", "smooth", "orthogonal"]).default("smooth").optional(),
  color: z.string().default("default").optional(),
  labelPlacement: z.enum(["center", "above", "below"]).default("above").optional(),
});

export const endpointSchema = z.object({
  nodeId: z.string().min(1),
  portId: z.string().optional(),
});

export const edgeSchema = z.object({
  id: z.string().min(1),
  source: endpointSchema,
  target: endpointSchema,
  label: z.string().optional(),
  direction: z.enum(["none", "forward", "backward", "bidirectional"]).default("forward").optional(),
  style: edgeStyleSchema.optional(),
  animationId: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const groupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  nodeIds: z.array(z.string().min(1)),
  style: z
    .object({
      variant: z.enum(["boundary", "lane", "none"]).default("boundary").optional(),
    })
    .optional(),
});

export const animationSchema = z.object({
  id: z.string().min(1),
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
  edgeIds: z.array(z.string().min(1)).min(1),
  enabled: z.boolean(),
  direction: z.enum(["forward", "backward", "bidirectional"]).default("forward").optional(),
  speed: z.number().positive().default(1).optional(),
  loop: z.boolean().default(true).optional(),
  label: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const diagramDocumentSchema = z.object({
  schemaVersion: z.literal("0.1"),
  id: z.string().min(1),
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
});

export type DiagramDocument = z.infer<typeof diagramDocumentSchema>;
export type DiagramNode = z.infer<typeof nodeSchema>;
export type DiagramEdge = z.infer<typeof edgeSchema>;
export type DiagramGroup = z.infer<typeof groupSchema>;
export type DiagramAnimation = z.infer<typeof animationSchema>;
export type EdgeLabelPlacement = NonNullable<DiagramEdge["style"]>["labelPlacement"];

export function parseDiagramDocument(value: unknown): DiagramDocument {
  return diagramDocumentSchema.parse(value);
}
