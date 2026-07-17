import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/dom";
import { parseDiagramDocument } from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import {
  addDiagramEdge,
  addDiagramNode,
  addDiagramScene,
  createDiagramEditor,
  deleteDiagramEdges,
  deleteDiagramNodes,
  deleteDiagramScene,
  moveDiagramSceneNodes,
  moveDiagramScene,
  moveDiagramNodes,
  resetDiagramSceneEdgeOverride,
  resetDiagramSceneNodeOverride,
  updateDiagramEdge,
  updateDiagramMetadata,
  updateDiagramNode,
  updateDiagramScene,
  updateDiagramSceneEdgeOverride,
  updateDiagramSceneNodeOverride,
} from "./index";

const diagram = parseDiagramDocument(sampleDiagram);

beforeEach(() => {
  document.body.replaceChildren();
  Object.defineProperty(SVGSVGElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 1240,
  });
  Object.defineProperty(SVGSVGElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 620,
  });
  SVGSVGElement.prototype.getBoundingClientRect = () => ({
    bottom: 620,
    height: 620,
    left: 0,
    right: 1240,
    top: 0,
    width: 1240,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

describe("diagram editor model", () => {
  it("adds schema-ready nodes with stable unique ids", () => {
    const first = addDiagramNode(diagram);
    const second = addDiagramNode(first.diagram);

    expect(first.node).toMatchObject({
      id: "node_1",
      label: "New Node",
      type: "server",
    });
    expect(second.node).toMatchObject({
      id: "node_2",
      label: "New Node 2",
      type: "server",
    });
    expect(diagram.nodes.every((node) =>
      Math.abs(node.position.x - first.node.position.x) >= 190 ||
      Math.abs(node.position.y - first.node.position.y) >= 120
    )).toBe(true);
    expect(diagram.nodes.some((node) => node.id === "node_1")).toBe(false);
    expect(() => parseDiagramDocument(second.diagram)).not.toThrow();
  });

  it("deletes connected edges and cleans every dependent reference", () => {
    const cascadingDiagram = parseDiagramDocument({
      ...diagram,
      groups: [
        ...(diagram.groups ?? []),
        { id: "clients", label: "Clients", nodeIds: ["user", "browser"] },
      ],
      animations: [{
        id: "anim_removed",
        type: "packet",
        edgeIds: ["edge_user_browser"],
        enabled: true,
      }],
      scenes: [{
        id: "scene_delete",
        title: "Delete references",
        animationIds: ["anim_removed"],
        nodeOverrides: [{ nodeId: "browser", tone: "active" }],
        edgeOverrides: [
          { edgeId: "edge_user_browser" },
          { edgeId: "edge_app_db" },
        ],
      }],
    });

    const updated = deleteDiagramNodes(cascadingDiagram, ["browser"]);

    expect(updated.nodes.some((node) => node.id === "browser")).toBe(false);
    expect(updated.edges.some((edge) =>
      edge.source.nodeId === "browser" || edge.target.nodeId === "browser"
    )).toBe(false);
    expect(updated.edges).toHaveLength(cascadingDiagram.edges.length - 2);
    expect(updated.animations).toEqual([]);
    expect(updated.groups?.find((group) => group.id === "clients")?.nodeIds).toEqual(["user"]);
    expect(updated.scenes?.[0]).toMatchObject({
      animationIds: [],
      nodeOverrides: [],
      edgeOverrides: [{ edgeId: "edge_app_db" }],
    });
    expect(() => parseDiagramDocument(updated)).not.toThrow();
  });

  it("adds edges with stable unique ids", () => {
    const first = addDiagramEdge(diagram, {
      sourceNodeId: "user",
      targetNodeId: "browser",
    });
    const second = addDiagramEdge(first.diagram, {
      sourceNodeId: "user",
      targetNodeId: "browser",
    });

    expect(first.edge).toMatchObject({
      id: "edge_user_browser_2",
      source: { nodeId: "user" },
      target: { nodeId: "browser" },
      label: "Connects",
      direction: "forward",
      style: {
        line: "solid",
        routing: "smooth",
        color: "accent",
        labelPlacement: "above",
      },
    });
    expect(second.edge.id).toBe("edge_user_browser_3");
    expect(diagram.edges).toHaveLength(5);
    expect(() => parseDiagramDocument(second.diagram)).not.toThrow();
  });

  it("deletes edges and cleans every dependent reference", () => {
    const cascadingDiagram = parseDiagramDocument({
      ...diagram,
      animations: [{
        id: "anim_removed",
        type: "packet",
        edgeIds: ["edge_user_browser"],
        enabled: true,
      }, {
        id: "anim_preserved",
        type: "request",
        edgeIds: ["edge_user_browser", "edge_app_db"],
        enabled: true,
      }],
      scenes: [{
        id: "scene_delete_edge",
        title: "Delete edge references",
        animationIds: ["anim_removed", "anim_preserved"],
        edgeOverrides: [
          { edgeId: "edge_user_browser" },
          { edgeId: "edge_app_db" },
        ],
      }],
    });

    const updated = deleteDiagramEdges(cascadingDiagram, ["edge_user_browser"]);

    expect(updated.edges.some((edge) => edge.id === "edge_user_browser")).toBe(false);
    expect(updated.animations).toEqual([{
      id: "anim_preserved",
      type: "request",
      edgeIds: ["edge_app_db"],
      enabled: true,
      direction: "forward",
      speed: 1,
      loop: true,
    }]);
    expect(updated.scenes?.[0]).toMatchObject({
      animationIds: ["anim_preserved"],
      edgeOverrides: [{ edgeId: "edge_app_db" }],
    });
    expect(() => parseDiagramDocument(updated)).not.toThrow();
  });

  it("rejects edge creation when either endpoint node does not exist", () => {
    expect(() => addDiagramEdge(diagram, {
      sourceNodeId: "missing",
      targetNodeId: "browser",
    })).toThrow("Edge endpoints must reference existing nodes.");
    expect(() => addDiagramEdge(diagram, {
      sourceNodeId: "user",
      targetNodeId: "missing",
    })).toThrow("Edge endpoints must reference existing nodes.");
  });

  it("updates a node without mutating the source document", () => {
    const updated = updateDiagramNode(diagram, "user", {
      label: "Customer",
      type: "api",
    });

    expect(updated).not.toBe(diagram);
    expect(updated.nodes.find((node) => node.id === "user")).toMatchObject({
      label: "Customer",
      type: "api",
    });
    expect(diagram.nodes.find((node) => node.id === "user")?.label).toBe("User");
  });

  it("updates title and optional description without mutating metadata", () => {
    const updated = updateDiagramMetadata(diagram, {
      title: "Updated Architecture",
      description: undefined,
    });

    expect(updated).not.toBe(diagram);
    expect(updated.metadata.title).toBe("Updated Architecture");
    expect(updated.metadata.description).toBeUndefined();
    expect(diagram.metadata.title).toBe("Basic Web Architecture");
    expect(diagram.metadata.description).toBeTruthy();
  });

  it("merges edge style updates without mutating the source document", () => {
    const updated = updateDiagramEdge(diagram, "edge_user_browser", {
      label: "Opens",
      style: { startMarker: "circle", endMarker: "triangle" },
    });

    expect(updated).not.toBe(diagram);
    expect(updated.edges.find((edge) => edge.id === "edge_user_browser")).toMatchObject({
      label: "Opens",
      style: {
        line: "solid",
        startMarker: "circle",
        endMarker: "triangle",
      },
    });
    expect(diagram.edges.find((edge) => edge.id === "edge_user_browser")?.label).toBe("Uses");
  });

  it("moves only the selected nodes by the same delta", () => {
    const updated = moveDiagramNodes(diagram, ["user", "browser"], { x: 35, y: -20 });
    const getPosition = (document: typeof diagram, nodeId: string) =>
      document.nodes.find((node) => node.id === nodeId)?.position;

    expect(getPosition(updated, "user")).toEqual({
      x: getPosition(diagram, "user")!.x + 35,
      y: getPosition(diagram, "user")!.y - 20,
    });
    expect(getPosition(updated, "browser")).toEqual({
      x: getPosition(diagram, "browser")!.x + 35,
      y: getPosition(diagram, "browser")!.y - 20,
    });
    expect(getPosition(updated, "load_balancer")).toEqual(getPosition(diagram, "load_balancer"));
    expect(getPosition(diagram, "user")).not.toEqual(getPosition(updated, "user"));
  });

  it("creates, updates, reorders, and deletes scenes without mutating the source", () => {
    const first = addDiagramScene(diagram);
    const second = addDiagramScene(first.diagram);
    const updated = updateDiagramScene(second.diagram, second.scene.id, {
      title: "Failure",
      description: "Requests fail before recovery.",
    });
    const reordered = moveDiagramScene(updated, second.scene.id, 0);
    const deleted = deleteDiagramScene(reordered, first.scene.id);

    expect(first.scene).toEqual({ id: "scene_1", title: "New Scene" });
    expect(second.scene).toEqual({ id: "scene_2", title: "New Scene 2" });
    expect(updated.scenes?.find((scene) => scene.id === "scene_2")).toMatchObject({
      title: "Failure",
      description: "Requests fail before recovery.",
    });
    expect(reordered.scenes?.map((scene) => scene.id)).toEqual([
      "scene_2",
      "scene_default",
      "scene_1",
    ]);
    expect(deleted.scenes?.map((scene) => scene.id)).toEqual(["scene_2", "scene_default"]);
    expect(diagram.scenes).toEqual([{ id: "scene_default", title: "Default Scene" }]);
    expect(() => parseDiagramDocument(deleted)).not.toThrow();
  });

  it("records scene node and edge overrides and removes values equal to the diagram", () => {
    const nodeUpdated = updateDiagramSceneNodeOverride(diagram, "scene_default", "user", {
      label: "Scene Customer",
      type: "api",
      position: { x: 140, y: 180 },
    });
    const edgeUpdated = updateDiagramSceneEdgeOverride(
      nodeUpdated,
      "scene_default",
      "edge_user_browser",
      {
        label: "Scene request",
        style: { color: "danger", line: "dashed" },
      },
    );

    expect(edgeUpdated.nodes.find((node) => node.id === "user")?.label).toBe("User");
    expect(edgeUpdated.scenes?.[0].nodeOverrides?.[0]).toMatchObject({
      nodeId: "user",
      label: "Scene Customer",
      type: "api",
      position: { x: 140, y: 180 },
    });
    expect(edgeUpdated.scenes?.[0].edgeOverrides?.[0]).toMatchObject({
      edgeId: "edge_user_browser",
      label: "Scene request",
      style: { color: "danger", line: "dashed" },
    });

    const nodeResetByValue = updateDiagramSceneNodeOverride(
      edgeUpdated,
      "scene_default",
      "user",
      { label: "User", type: "user", position: diagram.nodes[0].position },
    );
    expect(nodeResetByValue.scenes?.[0].nodeOverrides).toBeUndefined();
    expect(resetDiagramSceneEdgeOverride(
      nodeResetByValue,
      "scene_default",
      "edge_user_browser",
    ).scenes?.[0].edgeOverrides).toBeUndefined();
    expect(() => parseDiagramDocument(edgeUpdated)).not.toThrow();
  });

  it("moves nodes through scene position overrides without changing base positions", () => {
    const originalPosition = diagram.nodes.find((node) => node.id === "user")!.position;
    const updated = moveDiagramSceneNodes(
      diagram,
      "scene_default",
      ["user"],
      { x: 35, y: -20 },
    );

    expect(updated.nodes.find((node) => node.id === "user")?.position).toEqual(originalPosition);
    expect(updated.scenes?.[0].nodeOverrides?.[0]).toMatchObject({
      nodeId: "user",
      position: {
        x: originalPosition.x + 35,
        y: originalPosition.y - 20,
      },
    });
    expect(resetDiagramSceneNodeOverride(updated, "scene_default", "user").scenes?.[0].nodeOverrides)
      .toBeUndefined();
  });
});

describe("createDiagramEditor", () => {
  it("creates, selects, deletes, and restores a node through history", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram);

    const nodeId = editor.createNode();
    expect(nodeId).toBe("node_1");
    expect(editor.getState().selectedNodeIds).toEqual(["node_1"]);
    expect(container.querySelector('[data-node-id="node_1"]')).toBeTruthy();

    editor.deleteSelectedNodes();
    expect(container.querySelector('[data-node-id="node_1"]')).toBeNull();
    expect(editor.getState().selectedNodeIds).toEqual([]);

    editor.undo();
    expect(container.querySelector('[data-node-id="node_1"]')).toBeTruthy();
    editor.undo();
    expect(container.querySelector('[data-node-id="node_1"]')).toBeNull();
    editor.destroy();
  });

  it("deletes selected nodes with the keyboard but ignores text inputs", () => {
    const container = document.createElement("div");
    const input = document.createElement("input");
    document.body.append(container, input);
    const editor = createDiagramEditor(container, diagram);
    editor.selectNode("browser");

    fireEvent.keyDown(input, { key: "Backspace" });
    expect(editor.getState().diagram.nodes.some((node) => node.id === "browser")).toBe(true);

    const modal = document.createElement("section");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
    fireEvent.keyDown(window, { key: "Delete" });
    expect(editor.getState().diagram.nodes.some((node) => node.id === "browser")).toBe(true);
    modal.remove();

    fireEvent.keyDown(window, { key: "Delete" });
    expect(editor.getState().diagram.nodes.some((node) => node.id === "browser")).toBe(false);
    expect(editor.getState().diagram.edges).toHaveLength(diagram.edges.length - 2);
    editor.destroy();
  });

  it("shift-selects nodes, hides the inspector, and moves the group as one history entry", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchors: Array<{ left: number; top: number } | null> = [];
    const editor = createDiagramEditor(container, diagram, {
      onSelectionAnchorChange: (position) => anchors.push(position),
    });
    expect(container.classList.contains("interactive-diagram-editor")).toBe(true);
    const userNode = container.querySelector('[data-node-id="user"]');
    const browserNode = container.querySelector('[data-node-id="browser"]');
    const svg = container.querySelector(".diagram-svg");
    const untouchedNode = container.querySelector('[data-node-id="load_balancer"]');
    const userPosition = diagram.nodes.find((node) => node.id === "user")?.position;
    const browserPosition = diagram.nodes.find((node) => node.id === "browser")?.position;
    if (!userNode || !browserNode || !userPosition || !browserPosition) {
      throw new Error("Missing nodes for multi-selection test");
    }

    fireEvent.pointerDown(userNode, { button: 0, clientX: 100, clientY: 100 });
    expect(editor.getState().selectedNodeIds).toEqual(["user"]);
    expect(anchors.at(-1)).not.toBeNull();

    fireEvent.pointerDown(browserNode, {
      button: 0,
      clientX: 200,
      clientY: 100,
      shiftKey: true,
    });
    expect(editor.getState().selectedNodeIds).toEqual(["user", "browser"]);
    expect(editor.getState().selectedNodeId).toBeNull();
    expect(anchors.at(-1)).toBeNull();
    expect(userNode.classList.contains("node-selected")).toBe(true);
    expect(browserNode.classList.contains("node-selected")).toBe(true);

    fireEvent.click(browserNode);
    expect(editor.getState().selectedNodeIds).toEqual(["user", "browser"]);

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 290, clientY: 145 });
    fireEvent.pointerUp(window);

    expect(container.querySelector(".diagram-svg")).toBe(svg);
    expect(container.querySelector('[data-node-id="load_balancer"]')).toBe(untouchedNode);

    const movedUser = editor.getState().diagram.nodes.find((node) => node.id === "user");
    const movedBrowser = editor.getState().diagram.nodes.find((node) => node.id === "browser");
    const dragDelta = {
      x: (movedUser?.position.x ?? userPosition.x) - userPosition.x,
      y: (movedUser?.position.y ?? userPosition.y) - userPosition.y,
    };
    expect(dragDelta.x).not.toBe(0);
    expect(dragDelta.y).not.toBe(0);
    expect(movedBrowser?.position).toEqual({
      x: browserPosition.x + dragDelta.x,
      y: browserPosition.y + dragDelta.y,
    });
    expect(editor.getState().canUndo).toBe(true);

    editor.undo();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.position).toEqual(
      userPosition,
    );
    expect(editor.getState().diagram.nodes.find((node) => node.id === "browser")?.position).toEqual(
      browserPosition,
    );
    expect(editor.getState().canUndo).toBe(false);
    editor.destroy();
    expect(container.classList.contains("interactive-diagram-editor")).toBe(false);
  });

  it("selects and edits an edge with undo and redo history", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchors: Array<{ left: number; top: number } | null> = [];
    const editor = createDiagramEditor(container, diagram, {
      onSelectionAnchorChange: (position) => anchors.push(position),
    });
    const edgeHitArea = container.querySelector('[data-edge-id="edge_user_browser"] .edge-hit-area');
    if (!edgeHitArea) throw new Error("Missing edge hit area");

    fireEvent.pointerDown(edgeHitArea, { button: 0, clientX: 100, clientY: 100 });

    expect(editor.getState().selectedEdgeId).toBe("edge_user_browser");
    expect(editor.getState().selectedNodeId).toBeNull();
    expect(container.querySelector('[data-edge-id="edge_user_browser"]')?.classList.contains("edge-selected")).toBe(true);
    expect(anchors.at(-1)).not.toBeNull();

    editor.updateEdge("edge_user_browser", {
      label: "Opens",
      style: { startMarker: "circle", endMarker: "triangle" },
    });
    expect(editor.getState().diagram.edges[0]).toMatchObject({
      label: "Opens",
      style: { startMarker: "circle", endMarker: "triangle" },
    });

    editor.undo();
    expect(editor.getState().diagram.edges[0].label).toBe("Uses");
    editor.redo();
    expect(editor.getState().diagram.edges[0].label).toBe("Opens");
    editor.destroy();
  });

  it("creates, selects, deletes, and restores an edge through history", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram);

    const edgeId = editor.createEdge("browser", "database");
    expect(edgeId).toBe("edge_browser_database");
    expect(editor.getState().selectedEdgeId).toBe("edge_browser_database");
    expect(container.querySelector('[data-edge-id="edge_browser_database"]')).toBeTruthy();

    editor.deleteSelectedEdge();
    expect(container.querySelector('[data-edge-id="edge_browser_database"]')).toBeNull();
    expect(editor.getState().selectedEdgeId).toBeNull();

    editor.undo();
    expect(container.querySelector('[data-edge-id="edge_browser_database"]')).toBeTruthy();
    editor.undo();
    expect(container.querySelector('[data-edge-id="edge_browser_database"]')).toBeNull();
    editor.destroy();
  });

  it("creates an edge by entering edge creation mode and selecting a target node", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram);
    const targetNode = container.querySelector('[data-node-id="database"]');
    if (!targetNode) throw new Error("Missing target node");

    editor.beginEdgeCreation("user");
    expect(editor.getState().creatingEdgeSourceNodeId).toBe("user");
    expect(editor.getState().selectedNodeIds).toEqual(["user"]);
    expect(container.querySelector(".edge-creation-preview")).toBeTruthy();

    fireEvent.pointerMove(targetNode, { clientX: 460, clientY: 320 });
    expect(targetNode.classList.contains("edge-creation-target-hover")).toBe(true);
    expect(container.querySelector('[data-node-id="user"]')?.classList.contains("edge-creation-target-hover")).toBe(false);
    fireEvent.pointerDown(targetNode, { button: 0, clientX: 460, clientY: 320 });

    expect(editor.getState().creatingEdgeSourceNodeId).toBeNull();
    expect(editor.getState().selectedEdgeId).toBe("edge_user_database");
    expect(container.querySelector('[data-edge-id="edge_user_database"]')).toBeTruthy();
    expect(container.querySelector(".edge-creation-preview")).toBeNull();
    expect(targetNode.classList.contains("edge-creation-target-hover")).toBe(false);
    editor.destroy();
  });

  it("owns node edits and undo/redo history", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram);

    editor.updateNode("user", { label: "Customer" });
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe("Customer");
    expect(editor.getState().canUndo).toBe(true);

    editor.undo();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe("User");
    expect(editor.getState().canRedo).toBe(true);

    editor.redo();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe("Customer");
    editor.destroy();
  });

  it("owns metadata edits and undo/redo history", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram);

    editor.beginTransaction();
    editor.updateMetadata({ title: "Edited Architecture" });
    editor.updateMetadata({ description: undefined });
    editor.commitTransaction();
    expect(editor.getState().diagram.metadata).toMatchObject({
      title: "Edited Architecture",
    });
    expect(editor.getState().diagram.metadata.description).toBeUndefined();

    editor.undo();
    expect(editor.getState().diagram.metadata.title).toBe("Basic Web Architecture");
    expect(editor.getState().diagram.metadata.description).toBeTruthy();
    editor.redo();
    expect(editor.getState().diagram.metadata.title).toBe("Edited Architecture");
    editor.destroy();
  });

  it("owns scene management and restores it through history", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram);

    const sceneId = editor.createScene();
    expect(sceneId).toBe("scene_1");
    editor.beginTransaction();
    editor.updateScene(sceneId, { title: "Failure" });
    editor.updateScene(sceneId, { description: "The dependency is unavailable." });
    editor.commitTransaction();
    editor.moveScene(sceneId, 0);
    expect(editor.getState().diagram.scenes?.[0]).toMatchObject({
      id: "scene_1",
      title: "Failure",
      description: "The dependency is unavailable.",
    });

    editor.deleteScene(sceneId);
    expect(editor.getState().diagram.scenes?.some((scene) => scene.id === sceneId)).toBe(false);
    editor.undo();
    expect(editor.getState().diagram.scenes?.[0].id).toBe(sceneId);
    editor.undo();
    expect(editor.getState().diagram.scenes?.at(-1)?.id).toBe(sceneId);
    editor.undo();
    expect(editor.getState().diagram.scenes?.at(-1)).toEqual({
      id: sceneId,
      title: "New Scene",
    });
    editor.undo();
    expect(editor.getState().diagram.scenes).toEqual([
      { id: "scene_default", title: "Default Scene" },
    ]);
    editor.destroy();
  });

  it("edits scene overrides while blocking structural changes", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram, {
      editScope: "scene",
      sceneId: "scene_default",
    });

    expect(editor.getState().editScope).toBe("scene");
    expect(editor.createNode()).toBeNull();
    editor.selectNode("user");
    editor.deleteSelectedNodes();
    expect(editor.getState().diagram.nodes.some((node) => node.id === "user")).toBe(true);

    editor.updateNode("user", { label: "Scene Customer", type: "api" });
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe("User");
    expect(editor.getState().diagram.scenes?.[0].nodeOverrides?.[0]).toMatchObject({
      nodeId: "user",
      label: "Scene Customer",
      type: "api",
    });
    expect(container.querySelector('[data-node-id="user"]')?.textContent).toContain("Scene Customer");
    expect(container.querySelector('[data-node-id="user"]')?.classList.contains(
      "node-scene-overridden",
    )).toBe(true);

    editor.updateEdge("edge_user_browser", {
      label: "Scene request",
      style: { line: "dashed", color: "danger" },
    });
    expect(editor.getState().diagram.edges[0].label).toBe("Uses");
    expect(editor.getState().diagram.scenes?.[0].edgeOverrides?.[0]).toMatchObject({
      edgeId: "edge_user_browser",
      label: "Scene request",
      style: { line: "dashed", color: "danger" },
    });
    expect(container.querySelector('[data-edge-id="edge_user_browser"]')?.classList.contains(
      "edge-scene-overridden",
    )).toBe(true);

    editor.resetNodeOverrides("user");
    expect(editor.getState().diagram.scenes?.[0].nodeOverrides).toBeUndefined();
    expect(container.querySelector('[data-node-id="user"]')?.textContent).toContain("User");
    editor.resetEdgeOverrides("edge_user_browser");
    expect(editor.getState().diagram.scenes?.[0].edgeOverrides).toBeUndefined();

    const originalPosition = diagram.nodes.find((node) => node.id === "user")!.position;
    const sceneUserNode = container.querySelector('[data-node-id="user"]');
    if (!sceneUserNode) throw new Error("Missing scene user node");
    fireEvent.pointerDown(sceneUserNode, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 150, clientY: 125 });
    fireEvent.pointerUp(window);
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.position)
      .toEqual(originalPosition);
    expect(editor.getState().diagram.scenes?.[0].nodeOverrides?.[0].position)
      .not.toEqual(originalPosition);
    editor.destroy();
  });

  it("coalesces multiple updates in one edit transaction", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram);

    editor.beginTransaction();
    editor.updateNode("user", { label: "C" });
    editor.updateNode("user", { label: "Customer" });
    expect(editor.getState().canUndo).toBe(false);

    editor.commitTransaction();
    expect(editor.getState().canUndo).toBe(true);
    editor.undo();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe("User");
    expect(editor.getState().canUndo).toBe(false);
    editor.destroy();
  });

  it("restores the original diagram when an edit transaction is canceled", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram);

    editor.beginTransaction();
    editor.updateNode("user", { label: "Customer" });
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe(
      "Customer",
    );

    editor.cancelTransaction();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe("User");
    expect(editor.getState().canUndo).toBe(false);
    editor.destroy();
  });

  it("starts dragging only after selection and records one drag history entry", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchors: Array<{ left: number; top: number } | null> = [];
    const editor = createDiagramEditor(container, diagram, {
      onSelectedNodeAnchorChange: (position) => anchors.push(position),
    });
    const originalPosition = diagram.nodes.find((node) => node.id === "browser")?.position;
    const browserNode = container.querySelector('[data-node-id="browser"]');
    if (!browserNode || !originalPosition) {
      throw new Error("Missing browser node");
    }

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 220, clientY: 100 });
    expect(container.classList.contains("is-node-dragging")).toBe(false);
    expect(anchors.at(-1)).not.toBeNull();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "browser")?.position).toEqual(
      originalPosition,
    );

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 100, clientY: 100 });
    expect(anchors.at(-1)).toBeNull();
    fireEvent.pointerMove(window, { clientX: 220, clientY: 100 });
    expect(anchors.at(-1)).toBeNull();
    fireEvent.pointerUp(window);
    expect(anchors.at(-1)).not.toBeNull();

    const movedPosition = editor.getState().diagram.nodes.find((node) => node.id === "browser")?.position;
    expect(movedPosition?.x).toBe(originalPosition.x + 120);
    expect(movedPosition?.y).toBe(originalPosition.y);
    expect(editor.getState().canUndo).toBe(true);

    editor.undo();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "browser")?.position).toEqual(
      originalPosition,
    );
    expect(editor.getState().canUndo).toBe(false);
    editor.destroy();
  });

  it("hides the inspector anchor while zooming and restores it afterward", () => {
    vi.useFakeTimers();
    try {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const anchors: Array<{ left: number; top: number } | null> = [];
      const editor = createDiagramEditor(container, diagram, {
        onSelectedNodeAnchorChange: (position) => anchors.push(position),
      });
      editor.selectNode("user");
      expect(anchors.at(-1)).not.toBeNull();

      const svg = container.querySelector(".diagram-svg");
      if (!svg) {
        throw new Error("Missing diagram SVG");
      }
      fireEvent.wheel(svg, { clientX: 620, clientY: 310, deltaY: -200 });
      expect(anchors.at(-1)).toBeNull();

      vi.advanceTimersByTime(140);
      expect(anchors.at(-1)).not.toBeNull();
      editor.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
