import type { DiagramNode, EdgeLabelPlacement } from "@interactive-diagram/schema";
import type { NormalizedNode, Point, ViewBox } from "./types.js";

const EDGE_LABEL_OFFSET = 24;
const DEFAULT_DIAGRAM_BOUNDS: ViewBox = {
  x: 0,
  y: 0,
  width: 1200,
  height: 675,
};

export function normalizeNode(node: DiagramNode): NormalizedNode {
  return {
    ...node,
    size: node.size ?? { width: 150, height: 76 },
  };
}

export function getDiagramBounds(nodes: NormalizedNode[]): ViewBox {
  if (nodes.length === 0) return { ...DEFAULT_DIAGRAM_BOUNDS };

  const padding = 90;
  const minX = Math.min(...nodes.map((node) => node.position.x)) - padding;
  const minY = Math.min(...nodes.map((node) => node.position.y)) - padding;
  const maxX = Math.max(...nodes.map((node) => node.position.x + node.size.width)) + padding;
  const maxY = Math.max(...nodes.map((node) => node.position.y + node.size.height)) + padding;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getGroupBounds(nodes: NormalizedNode[]): ViewBox {
  const paddingX = 34;
  const paddingY = 42;
  const minX = Math.min(...nodes.map((node) => node.position.x)) - paddingX;
  const minY = Math.min(...nodes.map((node) => node.position.y)) - paddingY;
  const maxX = Math.max(...nodes.map((node) => node.position.x + node.size.width)) + paddingX;
  const maxY = Math.max(...nodes.map((node) => node.position.y + node.size.height)) + paddingY;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getRectConnectionPoint(
  fromNode: NormalizedNode,
  toNode: NormalizedNode,
): Point {
  const fromCenter = getNodeCenter(fromNode);
  const toCenter = getNodeCenter(toNode);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const halfWidth = fromNode.size.width / 2;
  const halfHeight = fromNode.size.height / 2;
  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  return {
    x: fromCenter.x + dx * scale,
    y: fromCenter.y + dy * scale,
  };
}

function getNodeCenter(node: NormalizedNode): Point {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

export function getPathData(source: Point, target: Point, routing: string): string {
  if (routing === "straight") {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }

  if (routing === "orthogonal") {
    const midX = (source.x + target.x) / 2;
    return `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`;
  }

  const dx = Math.abs(target.x - source.x);
  const controlOffset = Math.max(70, dx * 0.42);
  return `M ${source.x} ${source.y} C ${source.x + controlOffset} ${source.y}, ${target.x - controlOffset} ${target.y}, ${target.x} ${target.y}`;
}

export function getEdgeLabelAnchor(
  source: Point,
  target: Point,
  placement: EdgeLabelPlacement,
): Point {
  const anchor = {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  };
  if (placement === "center") return anchor;

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const direction = placement === "below" ? -1 : 1;

  if (Math.abs(dx) >= Math.abs(dy)) {
    anchor.y -= EDGE_LABEL_OFFSET * direction;
  } else {
    anchor.x += EDGE_LABEL_OFFSET * direction;
  }

  return anchor;
}
