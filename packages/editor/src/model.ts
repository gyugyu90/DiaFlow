import type { DiagramDocument, DiagramEdge, DiagramNode } from "@interactive-diagram/schema";
import type { EdgePatch, NodePatch } from "./types.js";

export type NewNodeInput = Partial<Pick<DiagramNode, "label" | "type" | "icon" | "position">>;

export type AddDiagramNodeResult = {
  diagram: DiagramDocument;
  node: DiagramNode;
};

export function addDiagramNode(
  diagram: DiagramDocument,
  input: NewNodeInput = {},
): AddDiagramNodeResult {
  const sequence = getNextNodeSequence(diagram);
  const node: DiagramNode = {
    id: `node_${sequence}`,
    type: input.type ?? "server",
    label: input.label ?? (sequence === 1 ? "New Node" : `New Node ${sequence}`),
    position: input.position ?? getNewNodePosition(diagram.nodes),
    ...(input.icon ? { icon: input.icon } : {}),
  };

  return {
    diagram: { ...diagram, nodes: [...diagram.nodes, node] },
    node,
  };
}

export function deleteDiagramNodes(
  diagram: DiagramDocument,
  nodeIds: Iterable<string>,
): DiagramDocument {
  const requestedNodeIds = new Set(nodeIds);
  const deletedNodeIds = new Set(
    diagram.nodes.filter((node) => requestedNodeIds.has(node.id)).map((node) => node.id),
  );
  if (deletedNodeIds.size === 0) return diagram;

  const deletedEdgeIds = new Set(
    diagram.edges.filter((edge) =>
      deletedNodeIds.has(edge.source.nodeId) || deletedNodeIds.has(edge.target.nodeId)
    ).map((edge) => edge.id),
  );
  const remainingEdges = diagram.edges.filter((edge) => !deletedEdgeIds.has(edge.id));
  const animations = diagram.animations?.map((animation) => ({
    ...animation,
    edgeIds: animation.edgeIds.filter((edgeId) => !deletedEdgeIds.has(edgeId)),
  })).filter((animation) => animation.edgeIds.length > 0);
  const remainingAnimationIds = new Set(animations?.map((animation) => animation.id) ?? []);

  return {
    ...diagram,
    nodes: diagram.nodes.filter((node) => !deletedNodeIds.has(node.id)),
    edges: remainingEdges.map((edge) => edge.animationId && !remainingAnimationIds.has(edge.animationId)
      ? { ...edge, animationId: undefined }
      : edge),
    groups: diagram.groups?.map((group) => ({
      ...group,
      nodeIds: group.nodeIds.filter((nodeId) => !deletedNodeIds.has(nodeId)),
    })),
    animations,
    scenes: diagram.scenes?.map((scene) => ({
      ...scene,
      animationIds: scene.animationIds?.filter((animationId) =>
        remainingAnimationIds.has(animationId)
      ),
      nodeOverrides: scene.nodeOverrides?.filter((override) =>
        !deletedNodeIds.has(override.nodeId)
      ),
      edgeOverrides: scene.edgeOverrides?.filter((override) =>
        !deletedEdgeIds.has(override.edgeId)
      ).map((override) => override.animationId && !remainingAnimationIds.has(override.animationId)
        ? { ...override, animationId: null }
        : override),
    })),
  };
}

export function updateDiagramEdge(
  diagram: DiagramDocument,
  edgeId: string,
  patch: EdgePatch,
): DiagramDocument {
  const edge = diagram.edges.find((candidate) => candidate.id === edgeId);
  if (!edge) return diagram;

  const nextEdge: DiagramEdge = {
    ...edge,
    ...patch,
    style: patch.style ? { ...edge.style, ...patch.style } : edge.style,
  };
  if (isSameEdge(edge, nextEdge)) return diagram;

  return {
    ...diagram,
    edges: diagram.edges.map((candidate) => candidate.id === edgeId ? nextEdge : candidate),
  };
}

export function updateDiagramNode(
  diagram: DiagramDocument,
  nodeId: string,
  patch: NodePatch,
): DiagramDocument {
  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || isSamePatch(node, patch)) return diagram;

  return {
    ...diagram,
    nodes: diagram.nodes.map((candidate) =>
      candidate.id === nodeId ? { ...candidate, ...patch } : candidate,
    ),
  };
}

export function moveDiagramNode(
  diagram: DiagramDocument,
  nodeId: string,
  position: DiagramNode["position"],
): DiagramDocument {
  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || (node.position.x === position.x && node.position.y === position.y)) return diagram;

  return {
    ...diagram,
    nodes: diagram.nodes.map((candidate) =>
      candidate.id === nodeId ? { ...candidate, position } : candidate,
    ),
  };
}

export function moveDiagramNodes(
  diagram: DiagramDocument,
  nodeIds: Iterable<string>,
  delta: DiagramNode["position"],
): DiagramDocument {
  const selectedNodeIds = new Set(nodeIds);
  if (selectedNodeIds.size === 0 || (delta.x === 0 && delta.y === 0)) return diagram;

  let didMove = false;
  const nodes = diagram.nodes.map((node) => {
    if (!selectedNodeIds.has(node.id)) return node;
    didMove = true;
    return {
      ...node,
      position: {
        x: node.position.x + delta.x,
        y: node.position.y + delta.y,
      },
    };
  });

  return didMove ? { ...diagram, nodes } : diagram;
}

function getNextNodeSequence(diagram: DiagramDocument): number {
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));
  let sequence = 1;
  while (nodeIds.has(`node_${sequence}`)) sequence += 1;
  return sequence;
}

function getNewNodePosition(nodes: DiagramNode[]): DiagramNode["position"] {
  const candidates = [300, 450, 150, 600].flatMap((y) =>
    [520, 300, 740, 80, 960].map((x) => ({ x, y })),
  );
  const available = candidates.find((candidate) => nodes.every((node) =>
    Math.abs(node.position.x - candidate.x) >= 190 ||
    Math.abs(node.position.y - candidate.y) >= 120
  ));
  if (available) return available;

  return {
    x: 180,
    y: Math.max(150, ...nodes.map((node) => node.position.y + 150)),
  };
}

function isSamePatch(node: DiagramNode, patch: NodePatch): boolean {
  return Object.entries(patch).every(([key, value]) => node[key as keyof NodePatch] === value);
}

function isSameEdge(edge: DiagramEdge, nextEdge: DiagramEdge): boolean {
  if (edge.label !== nextEdge.label) return false;

  const styleKeys = new Set([
    ...Object.keys(edge.style ?? {}),
    ...Object.keys(nextEdge.style ?? {}),
  ]);
  return Array.from(styleKeys).every((key) =>
    edge.style?.[key as keyof NonNullable<DiagramEdge["style"]>] ===
      nextEdge.style?.[key as keyof NonNullable<DiagramEdge["style"]>],
  );
}
