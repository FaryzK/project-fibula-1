import React, { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CanvasNodeCard } from '../components/nodes/CanvasNodeCard';
import {
  filterNodeTemplates,
  findRecenterTarget,
  getNextAvailablePosition
} from './workflowCanvasUtils';

const NODE_LIBRARY = [
  { key: 'manual_upload', label: 'Manual Upload', icon: 'U' },
  { key: 'if', label: 'IF', icon: 'I' },
  { key: 'switch', label: 'SWITCH', icon: 'S' },
  { key: 'set_value', label: 'Set Value', icon: 'V' },
  { key: 'document_folder', label: 'Document Folder', icon: 'F' },
  { key: 'extractor', label: 'Extractor', icon: 'E' },
  { key: 'reconciliation', label: 'Reconciliation', icon: 'R' },
  { key: 'http', label: 'HTTP', icon: 'H' },
  { key: 'webhook', label: 'Webhook', icon: 'W' }
];

const nodeTypes = {
  fibulaNode: CanvasNodeCard
};

function createNodeId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function WorkflowCanvasContent({ workflowId }) {
  const reactFlow = useReactFlow();
  const canvasWrapperRef = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isNodeLibraryOpen, setIsNodeLibraryOpen] = useState(false);
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');
  const [branchSourceNodeId, setBranchSourceNodeId] = useState(null);

  const filteredTemplates = useMemo(() => {
    return filterNodeTemplates(NODE_LIBRARY, nodeSearchQuery);
  }, [nodeSearchQuery]);

  const selectedNode = useMemo(() => {
    return nodes.find((node) => node.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  function getViewportCenterPosition() {
    const wrapperRect = canvasWrapperRef.current?.getBoundingClientRect();

    if (!wrapperRect) {
      return { x: 0, y: 0 };
    }

    return reactFlow.screenToFlowPosition({
      x: wrapperRect.left + wrapperRect.width / 2,
      y: wrapperRect.top + wrapperRect.height / 2
    });
  }

  function renameNode(nodeId) {
    const node = nodes.find((item) => item.id === nodeId);

    if (!node) {
      return;
    }

    const nextName = window.prompt('Rename node', node.data.label);

    if (!nextName) {
      return;
    }

    setNodes((currentNodes) => {
      return currentNodes.map((item) => {
        if (item.id !== nodeId) {
          return item;
        }

        return {
          ...item,
          data: {
            ...item.data,
            label: nextName.trim() || item.data.label
          }
        };
      });
    });
  }

  function openBranchLibrary(nodeId) {
    setBranchSourceNodeId(nodeId);
    setIsNodeLibraryOpen(true);
  }

  function createNodeData(template) {
    return {
      label: template.label,
      icon: template.icon,
      nodeTypeKey: template.key,
      createdAt: new Date().toISOString(),
      onRename: renameNode,
      onQuickAdd: openBranchLibrary
    };
  }

  function addNodeFromTemplate(template) {
    const branchSourceNode = branchSourceNodeId
      ? nodes.find((node) => node.id === branchSourceNodeId)
      : null;

    const desiredPosition = branchSourceNode
      ? {
          x: branchSourceNode.position.x + 280,
          y: branchSourceNode.position.y
        }
      : getViewportCenterPosition();

    const position = getNextAvailablePosition({
      desiredPosition,
      existingNodes: nodes
    });

    const nodeId = createNodeId();
    const nextNode = {
      id: nodeId,
      type: 'fibulaNode',
      position,
      data: createNodeData(template)
    };

    setNodes((currentNodes) => [...currentNodes, nextNode]);
    setSelectedNodeId(nodeId);

    if (branchSourceNodeId) {
      const edgeId = `edge_${branchSourceNodeId}_${nodeId}`;
      setEdges((currentEdges) => [
        ...currentEdges,
        {
          id: edgeId,
          source: branchSourceNodeId,
          target: nodeId,
          type: 'smoothstep'
        }
      ]);
    }

    setBranchSourceNodeId(null);
    setIsNodeLibraryOpen(false);
  }

  function handleConnect(connection) {
    setEdges((currentEdges) => {
      return addEdge({ ...connection, type: 'smoothstep' }, currentEdges);
    });
  }

  function recenterView() {
    const target = findRecenterTarget(nodes);
    reactFlow.setCenter(target.x, target.y, { zoom: 1, duration: 350 });
  }

  function closeNodeLibrary() {
    setIsNodeLibraryOpen(false);
    setNodeSearchQuery('');
    setBranchSourceNodeId(null);
  }

  return (
    <main style={{ fontFamily: 'system-ui', padding: '1rem 1.2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Workflow Canvas</h1>
          <p style={{ marginTop: 0, opacity: 0.75 }}>Workflow ID: {workflowId}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={recenterView}>
            Re-center
          </button>
          <button
            type="button"
            onClick={() => {
              setBranchSourceNodeId(null);
              setIsNodeLibraryOpen((current) => !current);
            }}
          >
            + Add Node
          </button>
          <Link to="/app">Back to Workflow Tab</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
        <div
          ref={canvasWrapperRef}
          style={{
            flex: 1,
            minHeight: '72vh',
            border: '1px solid #d1d5db',
            borderRadius: 12,
            background: '#f8fafc'
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            selectionOnDrag
            fitView
          >
            <Background gap={18} size={1} />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>

        {isNodeLibraryOpen ? (
          <aside
            style={{
              width: 280,
              border: '1px solid #d1d5db',
              borderRadius: 12,
              padding: 10,
              background: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{branchSourceNodeId ? 'Add Connected Node' : 'Node Library'}</strong>
              <button type="button" onClick={closeNodeLibrary}>
                Close
              </button>
            </div>
            <label htmlFor="canvas-node-search">Search nodes</label>
            <input
              id="canvas-node-search"
              type="text"
              value={nodeSearchQuery}
              onChange={(event) => setNodeSearchQuery(event.target.value)}
              placeholder="Type node name"
              style={{ width: '100%', marginTop: 6, marginBottom: 8 }}
            />
            <div style={{ display: 'grid', gap: 6 }}>
              {filteredTemplates.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => addNodeFromTemplate(template)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    padding: '6px 8px',
                    background: '#f8fafc'
                  }}
                >
                  {template.icon} {template.label}
                </button>
              ))}
              {filteredTemplates.length === 0 ? <p>No nodes match this search.</p> : null}
            </div>
          </aside>
        ) : null}
      </div>

      <section
        style={{
          marginTop: 10,
          border: '1px solid #d1d5db',
          borderRadius: 12,
          padding: 10,
          background: '#ffffff'
        }}
      >
        <strong>Node Menu</strong>
        {selectedNode ? (
          <div>
            <p style={{ marginBottom: 4 }}>
              <strong>Name:</strong> {selectedNode.data.label}
            </p>
            <p style={{ marginBottom: 4 }}>
              <strong>Input:</strong> Document and metadata
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Output:</strong> Node-specific output signal/document
            </p>
            <button type="button" onClick={() => renameNode(selectedNode.id)}>
              Rename Node
            </button>
          </div>
        ) : (
          <p>Click a node to view its menu.</p>
        )}
      </section>
    </main>
  );
}

export function WorkflowCanvasPage() {
  const { workflowId } = useParams();

  return (
    <ReactFlowProvider>
      <WorkflowCanvasContent workflowId={workflowId} />
    </ReactFlowProvider>
  );
}
