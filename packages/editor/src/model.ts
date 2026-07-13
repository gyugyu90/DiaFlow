import type { DiagramDocument, DiagramEdge, DiagramNode } from "@interactive-diagram/schema";
import type { EdgePatch, NodePatch } from "./types.js";

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
