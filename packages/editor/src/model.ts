import type { DiagramDocument, DiagramNode } from "@interactive-diagram/schema";
import type { NodePatch } from "./types.js";

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

function isSamePatch(node: DiagramNode, patch: NodePatch): boolean {
  return Object.entries(patch).every(([key, value]) => node[key as keyof NodePatch] === value);
}
