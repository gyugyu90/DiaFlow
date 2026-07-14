import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  DiagramScene,
  DiagramSceneEdgeOverride,
  DiagramSceneNodeOverride,
} from "@interactive-diagram/schema";

export function getScene(diagram: DiagramDocument, sceneId: string | null): DiagramScene | null {
  if (!sceneId) return null;
  return diagram.scenes?.find((scene) => scene.id === sceneId) ?? null;
}

export function applyScene(diagram: DiagramDocument, scene: DiagramScene | null): DiagramDocument {
  if (!scene) return diagram;

  const edgeOverrides = new Map(scene.edgeOverrides?.map((override) => [override.edgeId, override]) ?? []);
  const nodeOverrides = new Map(scene.nodeOverrides?.map((override) => [override.nodeId, override]) ?? []);
  const animationIds = scene.animationIds ? new Set(scene.animationIds) : null;
  const disabledEdgeIds = new Set(
    [...edgeOverrides.values()]
      .filter((override) => override.disabled)
      .map((override) => override.edgeId),
  );

  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => applyNodeOverride(node, nodeOverrides.get(node.id))),
    edges: diagram.edges.map((edge) => applyEdgeOverride(edge, edgeOverrides.get(edge.id))),
    animations: (diagram.animations ?? [])
      .filter((animation) => !animationIds || animationIds.has(animation.id))
      .map((animation) => ({
        ...animation,
        edgeIds: animation.edgeIds.filter((edgeId) => !disabledEdgeIds.has(edgeId)),
      }))
      .filter((animation) => animation.edgeIds.length > 0),
  };
}

function applyNodeOverride(
  node: DiagramNode,
  override: DiagramSceneNodeOverride | undefined,
): DiagramNode {
  if (!override) return node;
  return {
    ...node,
    data: {
      ...node.data,
      tone: override.tone,
      status: override.status,
    },
  };
}

function applyEdgeOverride(
  edge: DiagramEdge,
  override: DiagramSceneEdgeOverride | undefined,
): DiagramEdge {
  if (!override) return edge;

  const style = {
    ...edge.style,
    ...override.style,
  };
  if (override.tone) {
    style.color = toneToEdgeColor(override.tone);
  }
  if (override.disabled) {
    style.color = "muted";
    style.line = override.style?.line ?? "dashed";
  }

  return {
    ...edge,
    label: override.label ?? edge.label,
    direction: override.disabled ? "none" : edge.direction,
    style,
    data: {
      ...edge.data,
      disabled: override.disabled,
      tone: override.tone,
    },
  };
}

function toneToEdgeColor(tone: string): string {
  if (tone === "normal") return "default";
  if (tone === "active") return "accent";
  return tone;
}
