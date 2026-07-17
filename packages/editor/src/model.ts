import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  DiagramScene,
  DiagramSceneEdgeOverride,
  DiagramSceneNodeOverride,
} from "@interactive-diagram/schema";
import type { DiagramMetadataPatch, EdgePatch, NodePatch, ScenePatch } from "./types.js";

export type NewNodeInput = Partial<Pick<DiagramNode, "label" | "type" | "icon" | "position">>;
export type NewEdgeInput = {
  label?: string;
  sourceNodeId: string;
  targetNodeId: string;
};

export type AddDiagramNodeResult = {
  diagram: DiagramDocument;
  node: DiagramNode;
};

export type AddDiagramEdgeResult = {
  diagram: DiagramDocument;
  edge: DiagramEdge;
};

export type AddDiagramSceneResult = {
  diagram: DiagramDocument;
  scene: DiagramScene;
};

export type SceneNodeOverridePatch = Partial<
  Pick<DiagramSceneNodeOverride, "label" | "type" | "icon" | "position">
>;

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

export function addDiagramEdge(
  diagram: DiagramDocument,
  input: NewEdgeInput,
): AddDiagramEdgeResult {
  const hasSource = diagram.nodes.some((node) => node.id === input.sourceNodeId);
  const hasTarget = diagram.nodes.some((node) => node.id === input.targetNodeId);
  if (!hasSource || !hasTarget) {
    throw new Error("Edge endpoints must reference existing nodes.");
  }

  const edge: DiagramEdge = {
    id: getNextEdgeId(diagram, input.sourceNodeId, input.targetNodeId),
    source: { nodeId: input.sourceNodeId },
    target: { nodeId: input.targetNodeId },
    label: input.label ?? "Connects",
    direction: "forward",
    style: {
      line: "solid",
      routing: "smooth",
      color: "accent",
      labelPlacement: "above",
    },
  };

  return {
    diagram: { ...diagram, edges: [...diagram.edges, edge] },
    edge,
  };
}

export function addDiagramScene(diagram: DiagramDocument): AddDiagramSceneResult {
  const sequence = getNextSceneSequence(diagram);
  const scene: DiagramScene = {
    id: `scene_${sequence}`,
    title: sequence === 1 ? "New Scene" : `New Scene ${sequence}`,
  };

  return {
    diagram: { ...diagram, scenes: [...(diagram.scenes ?? []), scene] },
    scene,
  };
}

export function deleteDiagramScene(
  diagram: DiagramDocument,
  sceneId: string,
): DiagramDocument {
  if (!diagram.scenes?.some((scene) => scene.id === sceneId)) return diagram;

  const scenes = diagram.scenes.filter((scene) => scene.id !== sceneId);
  if (scenes.length > 0) return { ...diagram, scenes };

  const nextDiagram = { ...diagram };
  delete nextDiagram.scenes;
  return nextDiagram;
}

export function moveDiagramScene(
  diagram: DiagramDocument,
  sceneId: string,
  targetIndex: number,
): DiagramDocument {
  const scenes = diagram.scenes;
  if (!scenes) return diagram;

  const currentIndex = scenes.findIndex((scene) => scene.id === sceneId);
  const nextIndex = Math.max(0, Math.min(targetIndex, scenes.length - 1));
  if (currentIndex < 0 || currentIndex === nextIndex) return diagram;

  const nextScenes = [...scenes];
  const [scene] = nextScenes.splice(currentIndex, 1);
  nextScenes.splice(nextIndex, 0, scene);
  return { ...diagram, scenes: nextScenes };
}

export function updateDiagramScene(
  diagram: DiagramDocument,
  sceneId: string,
  patch: ScenePatch,
): DiagramDocument {
  const scene = diagram.scenes?.find((candidate) => candidate.id === sceneId);
  if (!scene) return diagram;

  const nextScene = { ...scene };
  if (patch.title !== undefined) nextScene.title = patch.title;
  if (Object.hasOwn(patch, "description")) {
    if (patch.description === undefined) delete nextScene.description;
    else nextScene.description = patch.description;
  }
  if (
    nextScene.title === scene.title
    && nextScene.description === scene.description
  ) return diagram;

  return {
    ...diagram,
    scenes: diagram.scenes?.map((candidate) => candidate.id === sceneId ? nextScene : candidate),
  };
}

export function updateDiagramSceneNodeOverride(
  diagram: DiagramDocument,
  sceneId: string,
  nodeId: string,
  patch: SceneNodeOverridePatch,
): DiagramDocument {
  const scene = diagram.scenes?.find((candidate) => candidate.id === sceneId);
  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  if (!scene || !node) return diagram;

  const existing = scene.nodeOverrides?.find((override) => override.nodeId === nodeId);
  const nextOverride: DiagramSceneNodeOverride = { ...existing, nodeId };

  if (Object.hasOwn(patch, "label")) {
    if (patch.label === undefined || patch.label === node.label) delete nextOverride.label;
    else nextOverride.label = patch.label;
  }
  if (Object.hasOwn(patch, "type")) {
    if (patch.type === undefined || patch.type === node.type) delete nextOverride.type;
    else nextOverride.type = patch.type;
  }
  if (Object.hasOwn(patch, "icon")) {
    if (patch.icon === undefined || patch.icon === node.icon) delete nextOverride.icon;
    else nextOverride.icon = patch.icon;
  }
  if (Object.hasOwn(patch, "position")) {
    if (!patch.position || isSamePoint(patch.position, node.position)) delete nextOverride.position;
    else nextOverride.position = patch.position;
  }

  return replaceSceneNodeOverride(
    diagram,
    sceneId,
    isEmptyNodeOverride(nextOverride) ? null : nextOverride,
    nodeId,
  );
}

export function updateDiagramSceneEdgeOverride(
  diagram: DiagramDocument,
  sceneId: string,
  edgeId: string,
  patch: EdgePatch,
): DiagramDocument {
  const scene = diagram.scenes?.find((candidate) => candidate.id === sceneId);
  const edge = diagram.edges.find((candidate) => candidate.id === edgeId);
  if (!scene || !edge) return diagram;

  const existing = scene.edgeOverrides?.find((override) => override.edgeId === edgeId);
  const nextOverride: DiagramSceneEdgeOverride = { ...existing, edgeId };

  if (Object.hasOwn(patch, "label")) {
    if (patch.label === edge.label) delete nextOverride.label;
    else nextOverride.label = patch.label;
  }
  if (patch.style) {
    const mergedStyle = { ...existing?.style, ...patch.style };
    const nextStyle = Object.fromEntries(
      Object.entries(mergedStyle).filter(([key, value]) =>
        edge.style?.[key as keyof NonNullable<DiagramEdge["style"]>] !== value
      ),
    ) as NonNullable<DiagramSceneEdgeOverride["style"]>;
    if (Object.keys(nextStyle).length > 0) nextOverride.style = nextStyle;
    else delete nextOverride.style;
  }

  return replaceSceneEdgeOverride(
    diagram,
    sceneId,
    isEmptyEdgeOverride(nextOverride) ? null : nextOverride,
    edgeId,
  );
}

export function resetDiagramSceneNodeOverride(
  diagram: DiagramDocument,
  sceneId: string,
  nodeId: string,
): DiagramDocument {
  return replaceSceneNodeOverride(diagram, sceneId, null, nodeId);
}

export function resetDiagramSceneEdgeOverride(
  diagram: DiagramDocument,
  sceneId: string,
  edgeId: string,
): DiagramDocument {
  return replaceSceneEdgeOverride(diagram, sceneId, null, edgeId);
}

export function moveDiagramSceneNodes(
  diagram: DiagramDocument,
  sceneId: string,
  nodeIds: Iterable<string>,
  delta: DiagramNode["position"],
): DiagramDocument {
  if (delta.x === 0 && delta.y === 0) return diagram;

  const selectedNodeIds = new Set(nodeIds);
  const scene = diagram.scenes?.find((candidate) => candidate.id === sceneId);
  if (!scene || selectedNodeIds.size === 0) return diagram;

  let nextDiagram = diagram;
  for (const node of diagram.nodes) {
    if (!selectedNodeIds.has(node.id)) continue;
    const override = scene.nodeOverrides?.find((candidate) => candidate.nodeId === node.id);
    const position = override?.position ?? node.position;
    nextDiagram = updateDiagramSceneNodeOverride(nextDiagram, sceneId, node.id, {
      position: {
        x: position.x + delta.x,
        y: position.y + delta.y,
      },
    });
  }
  return nextDiagram;
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
    edges: remainingEdges,
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
      ),
    })),
  };
}

export function deleteDiagramEdges(
  diagram: DiagramDocument,
  edgeIds: Iterable<string>,
): DiagramDocument {
  const requestedEdgeIds = new Set(edgeIds);
  const deletedEdgeIds = new Set(
    diagram.edges.filter((edge) => requestedEdgeIds.has(edge.id)).map((edge) => edge.id),
  );
  if (deletedEdgeIds.size === 0) return diagram;

  const animations = diagram.animations?.map((animation) => ({
    ...animation,
    edgeIds: animation.edgeIds.filter((edgeId) => !deletedEdgeIds.has(edgeId)),
  })).filter((animation) => animation.edgeIds.length > 0);
  const remainingAnimationIds = new Set(animations?.map((animation) => animation.id) ?? []);

  return {
    ...diagram,
    edges: diagram.edges.filter((edge) => !deletedEdgeIds.has(edge.id)),
    animations,
    scenes: diagram.scenes?.map((scene) => ({
      ...scene,
      animationIds: scene.animationIds?.filter((animationId) =>
        remainingAnimationIds.has(animationId)
      ),
      edgeOverrides: scene.edgeOverrides?.filter((override) =>
        !deletedEdgeIds.has(override.edgeId)
      ),
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

export function updateDiagramMetadata(
  diagram: DiagramDocument,
  patch: DiagramMetadataPatch,
): DiagramDocument {
  const metadata = { ...diagram.metadata };
  if (patch.title !== undefined) metadata.title = patch.title;
  if (Object.hasOwn(patch, "description")) {
    if (patch.description === undefined) delete metadata.description;
    else metadata.description = patch.description;
  }

  if (
    metadata.title === diagram.metadata.title
    && metadata.description === diagram.metadata.description
  ) return diagram;

  return { ...diagram, metadata };
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

function getNextSceneSequence(diagram: DiagramDocument): number {
  const sceneIds = new Set(diagram.scenes?.map((scene) => scene.id) ?? []);
  let sequence = 1;
  while (sceneIds.has(`scene_${sequence}`)) sequence += 1;
  return sequence;
}

function getNextEdgeId(
  diagram: DiagramDocument,
  sourceNodeId: string,
  targetNodeId: string,
): string {
  const edgeIds = new Set(diagram.edges.map((edge) => edge.id));
  const baseId = `edge_${sourceNodeId}_${targetNodeId}`;
  if (!edgeIds.has(baseId)) return baseId;

  let sequence = 2;
  while (edgeIds.has(`${baseId}_${sequence}`)) sequence += 1;
  return `${baseId}_${sequence}`;
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

function replaceSceneNodeOverride(
  diagram: DiagramDocument,
  sceneId: string,
  override: DiagramSceneNodeOverride | null,
  nodeId: string,
): DiagramDocument {
  const scene = diagram.scenes?.find((candidate) => candidate.id === sceneId);
  if (!scene) return diagram;

  const current = scene.nodeOverrides?.find((candidate) => candidate.nodeId === nodeId);
  if (!current && !override) return diagram;
  if (current && override && isSameNodeOverride(current, override)) return diagram;

  let nodeOverrides: DiagramSceneNodeOverride[];
  if (!override) {
    nodeOverrides = scene.nodeOverrides?.filter((candidate) => candidate.nodeId !== nodeId) ?? [];
  } else if (current) {
    nodeOverrides = scene.nodeOverrides!.map((candidate) =>
      candidate.nodeId === nodeId ? override : candidate
    );
  } else {
    nodeOverrides = [...(scene.nodeOverrides ?? []), override];
  }
  const nextScene = { ...scene };
  if (nodeOverrides.length > 0) nextScene.nodeOverrides = nodeOverrides;
  else delete nextScene.nodeOverrides;
  return replaceDiagramScene(diagram, nextScene);
}

function replaceSceneEdgeOverride(
  diagram: DiagramDocument,
  sceneId: string,
  override: DiagramSceneEdgeOverride | null,
  edgeId: string,
): DiagramDocument {
  const scene = diagram.scenes?.find((candidate) => candidate.id === sceneId);
  if (!scene) return diagram;

  const current = scene.edgeOverrides?.find((candidate) => candidate.edgeId === edgeId);
  if (!current && !override) return diagram;
  if (current && override && isSameEdgeOverride(current, override)) return diagram;

  let edgeOverrides: DiagramSceneEdgeOverride[];
  if (!override) {
    edgeOverrides = scene.edgeOverrides?.filter((candidate) => candidate.edgeId !== edgeId) ?? [];
  } else if (current) {
    edgeOverrides = scene.edgeOverrides!.map((candidate) =>
      candidate.edgeId === edgeId ? override : candidate
    );
  } else {
    edgeOverrides = [...(scene.edgeOverrides ?? []), override];
  }
  const nextScene = { ...scene };
  if (edgeOverrides.length > 0) nextScene.edgeOverrides = edgeOverrides;
  else delete nextScene.edgeOverrides;
  return replaceDiagramScene(diagram, nextScene);
}

function replaceDiagramScene(
  diagram: DiagramDocument,
  nextScene: DiagramScene,
): DiagramDocument {
  return {
    ...diagram,
    scenes: diagram.scenes?.map((scene) => scene.id === nextScene.id ? nextScene : scene),
  };
}

function isEmptyNodeOverride(override: DiagramSceneNodeOverride): boolean {
  return Object.keys(override).every((key) => key === "nodeId");
}

function isEmptyEdgeOverride(override: DiagramSceneEdgeOverride): boolean {
  return Object.keys(override).every((key) => key === "edgeId");
}

function isSamePoint(
  first: DiagramNode["position"],
  second: DiagramNode["position"],
): boolean {
  return first.x === second.x && first.y === second.y;
}

function isSameNodeOverride(
  first: DiagramSceneNodeOverride,
  second: DiagramSceneNodeOverride,
): boolean {
  return first.nodeId === second.nodeId
    && first.label === second.label
    && first.type === second.type
    && first.icon === second.icon
    && first.tone === second.tone
    && first.status === second.status
    && (
      first.position && second.position
        ? isSamePoint(first.position, second.position)
        : first.position === second.position
    );
}

function isSameEdgeOverride(
  first: DiagramSceneEdgeOverride,
  second: DiagramSceneEdgeOverride,
): boolean {
  if (
    first.edgeId !== second.edgeId
    || first.label !== second.label
    || first.disabled !== second.disabled
    || first.tone !== second.tone
  ) return false;

  const styleKeys = new Set([
    ...Object.keys(first.style ?? {}),
    ...Object.keys(second.style ?? {}),
  ]);
  return Array.from(styleKeys).every((key) =>
    first.style?.[key as keyof NonNullable<DiagramSceneEdgeOverride["style"]>] ===
      second.style?.[key as keyof NonNullable<DiagramSceneEdgeOverride["style"]>],
  );
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
