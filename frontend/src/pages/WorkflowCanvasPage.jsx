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
  applySetValuePreview,
  evaluateIfNodePreview,
  evaluateSwitchNodePreview,
  getDefaultNodeConfig,
  getNodePorts
} from './coreNodeUtils';
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

const BASE_MENU_TEXT = {
  input: 'Document and metadata',
  output: 'Node-specific output signal/document'
};

function createNodeId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeParseJson(text) {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (_error) {
    return { value: null, error: 'Sample metadata must be valid JSON.' };
  }
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
  const [sampleMetadataText, setSampleMetadataText] = useState(
    JSON.stringify(
      {
        totalAmount: 50,
        approved: false,
        vendor: { name: 'Acme Corporation' }
      },
      null,
      2
    )
  );
  const [previewResult, setPreviewResult] = useState('');

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
      config: getDefaultNodeConfig(template.key),
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
      const sourcePorts = getNodePorts(branchSourceNode.data).outputs;
      const sourceHandle = sourcePorts[0]?.id;
      const edgeId = `edge_${branchSourceNodeId}_${nodeId}`;

      setEdges((currentEdges) => [
        ...currentEdges,
        {
          id: edgeId,
          source: branchSourceNodeId,
          sourceHandle,
          target: nodeId,
          targetHandle: 'in-primary',
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

  function updateNodeConfig(nodeId, updater) {
    setNodes((currentNodes) => {
      return currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            config: updater(node.data.config || {})
          }
        };
      });
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

  function runPreview() {
    if (!selectedNode) {
      return;
    }

    const parsed = safeParseJson(sampleMetadataText);

    if (parsed.error) {
      setPreviewResult(parsed.error);
      return;
    }

    if (selectedNode.data.nodeTypeKey === 'if') {
      const outputBranch = evaluateIfNodePreview(parsed.value, selectedNode.data.config || {});
      setPreviewResult(`IF output branch: ${outputBranch}`);
      return;
    }

    if (selectedNode.data.nodeTypeKey === 'switch') {
      const outputBranch = evaluateSwitchNodePreview(parsed.value, selectedNode.data.config || {});
      setPreviewResult(`SWITCH output branch: ${outputBranch}`);
      return;
    }

    if (selectedNode.data.nodeTypeKey === 'set_value') {
      const nextMetadata = applySetValuePreview(parsed.value, selectedNode.data.config || {});
      setPreviewResult(`SET value output metadata: ${JSON.stringify(nextMetadata)}`);
      return;
    }

    setPreviewResult('Preview is available for IF, SWITCH, and Set Value nodes.');
  }

  function renderConditionEditor(node) {
    const config = node.data.config || {};
    const rules = config.rules || [];

    return (
      <>
        <p style={{ marginBottom: 4 }}>
          <strong>Input:</strong> Document and metadata
        </p>
        <p style={{ marginBottom: 4 }}>
          <strong>Output:</strong> True branch or False branch
        </p>
        <label htmlFor="if-logic">Rule connector</label>
        <br />
        <select
          id="if-logic"
          value={config.logic || 'AND'}
          onChange={(event) => {
            const nextLogic = event.target.value;
            updateNodeConfig(node.id, (current) => ({
              ...current,
              logic: nextLogic
            }));
          }}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>

        {rules.map((rule, index) => (
          <div key={`if-rule-${index}`} style={{ marginTop: 8, borderTop: '1px dashed #cbd5e1' }}>
            <p>Rule {index + 1}</p>
            <input
              type="text"
              placeholder="metadata path e.g. totalAmount"
              value={rule.fieldPath || ''}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextRules = [...(current.rules || [])];
                  nextRules[index] = { ...nextRules[index], fieldPath: nextValue };
                  return { ...current, rules: nextRules };
                });
              }}
            />
            <select
              value={rule.dataType || 'string'}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextRules = [...(current.rules || [])];
                  nextRules[index] = { ...nextRules[index], dataType: nextValue };
                  return { ...current, rules: nextRules };
                });
              }}
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="datetime">Date Time</option>
              <option value="boolean">Boolean</option>
            </select>
            <select
              value={rule.operator || 'equals'}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextRules = [...(current.rules || [])];
                  nextRules[index] = { ...nextRules[index], operator: nextValue };
                  return { ...current, rules: nextRules };
                });
              }}
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="not_contains">Not Contains</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
              <option value="greater_or_equal">Greater Or Equal</option>
              <option value="less_or_equal">Less Or Equal</option>
              <option value="is_true">Is True</option>
              <option value="is_false">Is False</option>
              <option value="exists">Exists</option>
              <option value="not_exists">Not Exists</option>
            </select>
            <input
              type="text"
              placeholder="comparison value"
              value={rule.value || ''}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextRules = [...(current.rules || [])];
                  nextRules[index] = { ...nextRules[index], value: nextValue };
                  return { ...current, rules: nextRules };
                });
              }}
            />
          </div>
        ))}
      </>
    );
  }

  function renderSwitchEditor(node) {
    const config = node.data.config || {};
    const switchCases = config.cases || [];

    return (
      <>
        <p style={{ marginBottom: 4 }}>
          <strong>Input:</strong> Document and metadata
        </p>
        <p style={{ marginBottom: 4 }}>
          <strong>Output:</strong> First true case, otherwise fallback
        </p>
        {switchCases.map((switchCase, index) => (
          <div key={switchCase.id} style={{ marginTop: 8, borderTop: '1px dashed #cbd5e1' }}>
            <p>{switchCase.label || `Case ${index + 1}`}</p>
            <input
              type="text"
              placeholder="case label"
              value={switchCase.label || ''}
              onChange={(event) => {
                const nextLabel = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextCases = [...(current.cases || [])];
                  nextCases[index] = { ...nextCases[index], label: nextLabel };
                  return { ...current, cases: nextCases };
                });
              }}
            />
            <input
              type="text"
              placeholder="metadata path"
              value={switchCase.rule?.fieldPath || ''}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextCases = [...(current.cases || [])];
                  nextCases[index] = {
                    ...nextCases[index],
                    rule: { ...(nextCases[index].rule || {}), fieldPath: nextValue }
                  };
                  return { ...current, cases: nextCases };
                });
              }}
            />
            <select
              value={switchCase.rule?.dataType || 'string'}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextCases = [...(current.cases || [])];
                  nextCases[index] = {
                    ...nextCases[index],
                    rule: { ...(nextCases[index].rule || {}), dataType: nextValue }
                  };
                  return { ...current, cases: nextCases };
                });
              }}
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="datetime">Date Time</option>
              <option value="boolean">Boolean</option>
            </select>
            <select
              value={switchCase.rule?.operator || 'equals'}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextCases = [...(current.cases || [])];
                  nextCases[index] = {
                    ...nextCases[index],
                    rule: { ...(nextCases[index].rule || {}), operator: nextValue }
                  };
                  return { ...current, cases: nextCases };
                });
              }}
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="not_contains">Not Contains</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
              <option value="greater_or_equal">Greater Or Equal</option>
              <option value="less_or_equal">Less Or Equal</option>
              <option value="is_true">Is True</option>
              <option value="is_false">Is False</option>
            </select>
            <input
              type="text"
              placeholder="comparison value"
              value={switchCase.rule?.value || ''}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextCases = [...(current.cases || [])];
                  nextCases[index] = {
                    ...nextCases[index],
                    rule: { ...(nextCases[index].rule || {}), value: nextValue }
                  };
                  return { ...current, cases: nextCases };
                });
              }}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            updateNodeConfig(node.id, (current) => {
              const currentCases = current.cases || [];

              if (currentCases.length >= 10) {
                return current;
              }

              const nextCaseNumber = currentCases.length + 1;

              return {
                ...current,
                cases: [
                  ...currentCases,
                  {
                    id: `case_${nextCaseNumber}`,
                    label: `Case ${nextCaseNumber}`,
                    rule: { fieldPath: '', dataType: 'string', operator: 'equals', value: '' }
                  }
                ]
              };
            });
          }}
        >
          Add Case
        </button>
      </>
    );
  }

  function renderSetValueEditor(node) {
    const config = node.data.config || {};
    const assignments = config.assignments || [];

    return (
      <>
        <p style={{ marginBottom: 4 }}>
          <strong>Input:</strong> Document and metadata
        </p>
        <p style={{ marginBottom: 4 }}>
          <strong>Output:</strong> Enriched metadata
        </p>
        {assignments.map((assignment, index) => (
          <div key={`assignment-${index}`} style={{ marginTop: 8, borderTop: '1px dashed #cbd5e1' }}>
            <p>Assignment {index + 1}</p>
            <input
              type="text"
              placeholder="field path"
              value={assignment.fieldPath || ''}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextAssignments = [...(current.assignments || [])];
                  nextAssignments[index] = { ...nextAssignments[index], fieldPath: nextValue };
                  return { ...current, assignments: nextAssignments };
                });
              }}
            />
            <input
              type="text"
              placeholder="value"
              value={assignment.value || ''}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateNodeConfig(node.id, (current) => {
                  const nextAssignments = [...(current.assignments || [])];
                  nextAssignments[index] = { ...nextAssignments[index], value: nextValue };
                  return { ...current, assignments: nextAssignments };
                });
              }}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            updateNodeConfig(node.id, (current) => ({
              ...current,
              assignments: [...(current.assignments || []), { fieldPath: '', value: '' }]
            }));
          }}
        >
          Add Assignment
        </button>
      </>
    );
  }

  function renderNodeMenu(node) {
    if (node.data.nodeTypeKey === 'manual_upload') {
      return (
        <>
          <p style={{ marginBottom: 4 }}>
            <strong>Input:</strong> Drag and drop file
          </p>
          <p style={{ marginBottom: 4 }}>
            <strong>Output:</strong> Document
          </p>
          <p style={{ marginBottom: 4 }}>
            Accepted file types: {(node.data.config?.acceptedFileTypes || []).join(', ')}
          </p>
        </>
      );
    }

    if (node.data.nodeTypeKey === 'if') {
      return renderConditionEditor(node);
    }

    if (node.data.nodeTypeKey === 'switch') {
      return renderSwitchEditor(node);
    }

    if (node.data.nodeTypeKey === 'set_value') {
      return renderSetValueEditor(node);
    }

    return (
      <>
        <p style={{ marginBottom: 4 }}>
          <strong>Input:</strong> {BASE_MENU_TEXT.input}
        </p>
        <p style={{ marginBottom: 4 }}>
          <strong>Output:</strong> {BASE_MENU_TEXT.output}
        </p>
      </>
    );
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
            <button type="button" onClick={() => renameNode(selectedNode.id)}>
              Rename Node
            </button>
            {renderNodeMenu(selectedNode)}
            <hr />
            <label htmlFor="sample-metadata">Sample metadata (JSON)</label>
            <textarea
              id="sample-metadata"
              rows={6}
              value={sampleMetadataText}
              onChange={(event) => setSampleMetadataText(event.target.value)}
              style={{ width: '100%' }}
            />
            <button type="button" onClick={runPreview}>
              Run Preview
            </button>
            {previewResult ? <p>{previewResult}</p> : null}
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
