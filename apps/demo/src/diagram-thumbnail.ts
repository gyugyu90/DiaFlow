import type { DiagramDocument, DiagramNode } from "@interactive-diagram/schema";
import type { ViewBox } from "@interactive-diagram/runtime";

const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const THUMBNAIL_NODE_LIMIT = 3;
const THUMBNAIL_PADDING = 48;
const MIN_THUMBNAIL_WIDTH = 480;
const DEFAULT_THUMBNAIL_VIEW_BOX: ViewBox = { x: 0, y: 0, width: 640, height: 360 };
const DEFAULT_NODE_SIZE = { width: 150, height: 76 };

export function getDiagramThumbnailViewBox(diagram: DiagramDocument): ViewBox {
  const nodes = collectThumbnailNodes(diagram);
  if (nodes.length === 0) return DEFAULT_THUMBNAIL_VIEW_BOX;

  const minX = Math.min(...nodes.map((node) => node.position.x)) - THUMBNAIL_PADDING;
  const minY = Math.min(...nodes.map((node) => node.position.y)) - THUMBNAIL_PADDING;
  const maxX = Math.max(...nodes.map((node) =>
    node.position.x + (node.size?.width ?? DEFAULT_NODE_SIZE.width)
  )) + THUMBNAIL_PADDING;
  const maxY = Math.max(...nodes.map((node) =>
    node.position.y + (node.size?.height ?? DEFAULT_NODE_SIZE.height)
  )) + THUMBNAIL_PADDING;

  return fitToAspectRatio({
    x: minX,
    y: minY,
    width: Math.max(MIN_THUMBNAIL_WIDTH, maxX - minX),
    height: maxY - minY,
  });
}

function collectThumbnailNodes(diagram: DiagramDocument): DiagramNode[] {
  const firstNode = diagram.nodes[0];
  if (!firstNode) return [];

  const nodesById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const selectedIds = [firstNode.id];
  const visitedIds = new Set(selectedIds);

  for (let index = 0; index < selectedIds.length; index += 1) {
    const nodeId = selectedIds[index];
    for (const edge of diagram.edges) {
      const connectedId = edge.source.nodeId === nodeId
        ? edge.target.nodeId
        : edge.target.nodeId === nodeId
          ? edge.source.nodeId
          : null;
      if (!connectedId || visitedIds.has(connectedId) || !nodesById.has(connectedId)) continue;

      visitedIds.add(connectedId);
      selectedIds.push(connectedId);
      if (selectedIds.length === THUMBNAIL_NODE_LIMIT) {
        return selectedIds.map((id) => nodesById.get(id) as DiagramNode);
      }
    }
  }

  return selectedIds.map((id) => nodesById.get(id) as DiagramNode);
}

function fitToAspectRatio(viewBox: ViewBox): ViewBox {
  const width = Math.max(viewBox.width, viewBox.height * THUMBNAIL_ASPECT_RATIO);
  const height = width / THUMBNAIL_ASPECT_RATIO;
  const centerX = viewBox.x + viewBox.width / 2;
  const centerY = viewBox.y + viewBox.height / 2;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}
