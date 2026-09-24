'use client';

/**
 * Interactive blueprint / flowchart canvas — pan, zoom, drag nodes, draw
 * connections, add nodes from the palette. Shared by Command and INC so both
 * apps render and edit blueprints with one implementation.
 *
 * Styling is intentionally self-contained: CSS custom properties with
 * fallbacks, so it inherits the host app theme (var(--surface), var(--brand),
 * ...) and degrades gracefully when the vars are absent. The React Flow base
 * stylesheet must be imported once by the host app:
 *
 *   import '@xyflow/react/dist/style.css';
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps
} from '@xyflow/react';
import { Icon, type IconName } from './icons';

/* ------------------------------------------------------------- data model -- */

export interface BlueprintCanvasNodeData {
  id: string;
  /** Node category — service, database, api, decision, event, ... */
  type: string;
  label: string;
  x: number;
  y: number;
  data?: { description?: string };
}

export interface BlueprintCanvasEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface BlueprintCanvasPayload {
  nodes: BlueprintCanvasNodeData[];
  edges: BlueprintCanvasEdgeData[];
}

interface FlowNodeData extends Record<string, unknown> {
  kind: string;
  label: string;
  description?: string;
}

type FlowNode = Node<FlowNodeData, 'blueprintNode'>;

/* ------------------------------------------------------------ node palette -- */

interface NodeKind {
  label: string;
  icon: IconName;
  color: string;
  tint: string;
  text: string;
}

const V = (name: string, fallback: string) => `var(--${name}, ${fallback})`;

const KIND_SPECS: Record<string, { label: string; icon: IconName; color: string; tint: string }> = {
  service: { label: 'Service', icon: 'monitor', color: V('brand', '#4f46e5'), tint: V('brand-tint', '#eef2ff') },
  system: { label: 'System', icon: 'cpu', color: V('brand', '#4f46e5'), tint: V('brand-tint', '#eef2ff') },
  database: { label: 'Database', icon: 'database', color: V('good', '#059669'), tint: V('good-tint', '#ecfdf5') },
  queue: { label: 'Queue', icon: 'more-horizontal', color: V('warn', '#d97706'), tint: V('warn-tint', '#fffbeb') },
  api: { label: 'API', icon: 'link', color: V('warn', '#d97706'), tint: V('warn-tint', '#fffbeb') },
  ui: { label: 'UI / Client', icon: 'columns', color: V('accent', '#7c3aed'), tint: V('accent-tint', '#f5f3ff') },
  external: { label: 'External', icon: 'globe', color: V('ink-3', '#8a8f98'), tint: V('surface-2', '#f1f2f4') },
  event: { label: 'Event', icon: 'zap', color: V('warn', '#d97706'), tint: V('warn-tint', '#fffbeb') },
  process: { label: 'Process', icon: 'refresh', color: V('accent', '#7c3aed'), tint: V('accent-tint', '#f5f3ff') },
  decision: { label: 'Decision', icon: 'decisions', color: V('risk', '#dc2626'), tint: V('risk-tint', '#fef2f2') },
  start: { label: 'Start', icon: 'check-circle', color: V('good', '#059669'), tint: V('good-tint', '#ecfdf5') },
  end: { label: 'End', icon: 'flag', color: V('risk', '#dc2626'), tint: V('risk-tint', '#fef2f2') }
};

export const BLUEPRINT_NODE_KINDS: Record<string, { label: string; icon: IconName }> = Object.fromEntries(
  Object.entries(KIND_SPECS).map(([key, spec]) => [key, { label: spec.label, icon: spec.icon }])
);

/** Normalize an arbitrary stored kind to a known palette kind (fallback: service). */
export function blueprintKindFallback(kind: string | null | undefined): string {
  return kind && kind in KIND_SPECS ? kind : 'service';
}

/* ------------------------------------------------------------- node widget -- */

function NodeLabelEditor({ value, disabled, onCommit }: { value: string; disabled?: boolean; onCommit: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div className="ksp-bp-label-wrap" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span className="ksp-bp-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        {!disabled && (
          <button
            type="button"
            aria-label="Edit node label"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setDraft(value);
              setEditing(true);
            }}
            style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: V('ink-4', '#a0a5ad'), display: 'inline-flex' }}
          >
            <Icon name="edit" className="ksp-bp-edit" style={{ width: 12, height: 12 }} />
          </button>
        )}
      </div>
    );
  }

  return (
    <input
      autoFocus
      defaultValue={draft}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={(event) => {
        const next = event.currentTarget.value.trim();
        setEditing(false);
        if (next && next !== value) onCommit(next.slice(0, 120));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(value);
          setEditing(false);
        }
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        width: 120,
        border: `1px solid ${V('line-2', '#d5d9df')}`,
        borderRadius: 6,
        padding: '2px 6px',
        fontSize: 12,
        fontFamily: 'inherit',
        color: V('ink', '#17181c'),
        background: V('surface', '#ffffff'),
        outline: 'none'
      }}
    />
  );
}

function BlueprintNodeWidget({ data, selected, disabled, onLabelChange }: NodeProps & { disabled?: boolean; onLabelChange?: (label: string) => void }) {
  const nodeData = data as unknown as FlowNodeData;
  const spec = KIND_SPECS[nodeData.kind] ?? KIND_SPECS.service;
  const nodeStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 150,
    maxWidth: 260,
    padding: '10px 12px 10px 10px',
    borderRadius: 14,
    background: V('surface', '#ffffff'),
    border: `1.5px solid ${selected ? spec.color : V('line', '#e3e6ea')}`,
    boxShadow: selected ? `0 0 0 3px ${spec.tint}, 0 10px 24px -12px rgba(0,0,0,0.25)` : '0 6px 16px -10px rgba(0,0,0,0.18)',
    fontFamily: 'inherit'
  };

  return (
    <div className="ksp-bp-node" style={nodeStyle}>
      <Handle type="target" position={Position.Left} style={{ background: spec.color, border: `2px solid ${V('surface', '#fff')}` }} />
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: 9,
          background: spec.tint,
          color: spec.color
        }}
      >
        <Icon name={spec.icon} style={{ width: 16, height: 16 }} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <NodeLabelEditor value={nodeData.label} disabled={disabled} onCommit={(label) => onLabelChange?.(label)} />
        {nodeData.description && (
          <span
            style={{
              marginTop: 3,
              fontSize: 10.5,
              lineHeight: 1.35,
              color: V('ink-4', '#9aa0a9'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const
            }}
          >
            {nodeData.description}
          </span>
        )}
      </span>
      <Handle type="source" position={Position.Right} style={{ background: spec.color, border: `2px solid ${V('surface', '#fff')}` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ canvas -- */

function serialize(nodes: FlowNode[], edges: Edge[]): BlueprintCanvasPayload {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.kind,
      label: node.data.label,
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
      data: node.data.description ? { description: node.data.description } : undefined
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ? String(edge.label) : undefined
    }))
  };
}

function toFlowNodes(canvas: BlueprintCanvasPayload): FlowNode[] {
  return canvas.nodes.map((node) => ({
    id: node.id,
    type: 'blueprintNode' as const,
    position: { x: node.x, y: node.y },
    data: {
      kind: blueprintKindFallback(node.type),
      label: node.label,
      description: node.data?.description
    }
  }));
}

function toFlowEdges(canvas: BlueprintCanvasPayload): Edge[] {
  return canvas.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: 'smoothstep'
  }));
}

function nodeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `bp-${crypto.randomUUID()}`;
  return `bp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function BlueprintFlow({
  canvas,
  readOnly,
  onChange
}: {
  canvas: BlueprintCanvasPayload;
  readOnly: boolean;
  onChange: (next: BlueprintCanvasPayload) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes] = useState<FlowNode[]>(() => toFlowNodes(canvas));
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(canvas));

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => setNodes((current) => applyNodeChanges<FlowNode>(changes, current)),
    []
  );
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((current) => applyEdgeChanges(changes, current)), []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge({ ...connection, id: `e-${nodeId()}`, type: 'smoothstep' }, current)
      );
    },
    []
  );

  const commit = useCallback(
    (nextNodes: FlowNode[], nextEdges: Edge[]) => {
      if (readOnly) return;
      onChange(serialize(nextNodes, nextEdges));
    },
    [readOnly, onChange]
  );

  useEffect(() => {
    commit(nodes, edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const updateNodeLabel = useCallback(
    (id: string, label: string) => {
      setNodes((current) => current.map((node) => (node.id === id ? { ...node, data: { ...node.data, label } } : node)));
    },
    []
  );

  const addNode = useCallback(
    (kind: string) => {
      if (readOnly) return;
      const spec = KIND_SPECS[kind] ?? KIND_SPECS.service;
      const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
      const id = nodeId();
      const next: FlowNode = {
        id,
        type: 'blueprintNode',
        position,
        data: {
          kind,
          label: `New ${spec.label.toLowerCase()}`,
          description: ''
        }
      };
      setNodes((current) => [...current, next]);
      setTimeout(() => {
        document.querySelector(`[data-id="${id}"]`)?.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'smooth' });
      }, 50);
    },
    [readOnly, screenToFlowPosition]
  );

  const nodeTypes = useMemo(
    () => ({
      blueprintNode: (props: NodeProps) => <BlueprintNodeWidget {...props} disabled={readOnly} onLabelChange={(label) => updateNodeLabel(props.id, label)} />
    }),
    [readOnly, updateNodeLabel]
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: V('ink-3', '#8a8f98') }
    }),
    []
  );

  return (
    <div className="ksp-blueprint-canvas" style={{ width: '100%', height: '100%', position: 'relative', background: V('canvas', '#fafafa') }}>
      {!readOnly && (
        <div
          className="ksp-bp-palette"
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            maxWidth: '92%',
            padding: '8px 10px',
            borderRadius: 12,
            background: V('surface', '#ffffff'),
            border: `1px solid ${V('line', '#e3e6ea')}`,
            boxShadow: '0 12px 28px -14px rgba(0,0,0,0.3)'
          }}
          role="toolbar"
          aria-label="Add blueprint node"
        >
          {Object.entries(KIND_SPECS).map(([kind, spec]) => (
            <button
              key={kind}
              type="button"
              onClick={() => addNode(kind)}
              title={spec.label}
              aria-label={`Add ${spec.label.toLowerCase()} node`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                border: `1px solid ${V('line', '#e3e6ea')}`,
                background: V('surface-2', '#f3f4f6'),
                color: V('ink-2', '#3d4149'),
                borderRadius: 8,
                padding: '5px 8px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onClickCapture={(event) => event.stopPropagation()}
            >
              <Icon name={spec.icon} style={{ width: 13, height: 13, color: spec.color }} />
              {spec.label}
            </button>
          ))}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        panOnDrag
        zoomOnScroll
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.15}
        maxZoom={2.5}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color={V('line-2', '#d5d9df')} />
        <Controls showInteractive={!readOnly} position="bottom-left" />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          style={{ background: V('surface', '#ffffff'), border: `1px solid ${V('line', '#e3e6ea')}` }}
          nodeColor={(node) => {
            const kind = (node.data as { kind?: string } | undefined)?.kind;
            return KIND_SPECS[kind ?? '']?.color ?? V('line-2', '#d5d9df');
          }}
        />
      </ReactFlow>
    </div>
  );
}

/**
 * Interactive blueprint canvas. Works in edit mode (palette, drag, connect)
 * and readOnly mode (presentation). When `onChange` is provided and the mode
 * is editable, every structural change is serialized to the canvas payload.
 */
export function BlueprintCanvas({
  canvas,
  onChange,
  readOnly = false,
  height = 560,
  className
}: {
  canvas: BlueprintCanvasPayload;
  onChange?: (next: BlueprintCanvasPayload) => void;
  readOnly?: boolean;
  height?: number | string;
  className?: string;
}) {
  return (
    <div className={className} style={{ width: '100%', height, borderRadius: 16, overflow: 'hidden', border: `1px solid ${V('line', '#e3e6ea')}`, position: 'relative' }}>
      <BlueprintCanvasStyles />
      <ReactFlowProvider>
        <BlueprintFlow canvas={canvas} readOnly={readOnly} onChange={onChange ?? (() => undefined)} />
      </ReactFlowProvider>
    </div>
  );
}

/**
 * Scoped structural overrides for the React Flow base stylesheet. Everything
 * here is namespaced under .ksp-blueprint-canvas so no host app is affected.
 */
function BlueprintCanvasStyles() {
  return (
    <style>{`
      .ksp-blueprint-canvas .react-flow__attribution { display: none; }
      .ksp-blueprint-canvas .react-flow__node { cursor: grab; }
      .ksp-blueprint-canvas .react-flow__node.dragging { cursor: grabbing; }
      .ksp-blueprint-canvas .react-flow__node.selected .ksp-bp-node { }
      .ksp-blueprint-canvas .react-flow__handle { width: 10px; height: 10px; }
      .ksp-blueprint-canvas .react-flow__edge-path { stroke: ${V('line-2', '#c6cbd2')}; stroke-width: 1.75; }
      .ksp-blueprint-canvas .react-flow__edge.selected .react-flow__edge-path { stroke: ${V('ink-3', '#8a8f98')}; }
      .ksp-blueprint-canvas .react-flow__edge-text { font-size: 10px; fill: ${V('ink-4', '#9aa0a9')}; }
      .ksp-blueprint-canvas .react-flow__controls { border-radius: 10px; overflow: hidden; box-shadow: 0 8px 20px -10px rgba(0,0,0,0.3); }
      .ksp-blueprint-canvas .react-flow__controls-button { background: ${V('surface', '#fff')}; border-bottom: 1px solid ${V('line', '#e3e6ea')}; color: ${V('ink-2', '#3d4149')}; width: 26px; height: 26px; }
      .ksp-blueprint-canvas .react-flow__controls-button:hover { background: ${V('surface-2', '#f3f4f6')}; }
      .ksp-blueprint-canvas .react-flow__controls-button svg { fill: currentColor; }
      .ksp-blueprint-canvas .react-flow__minimap { border-radius: 10px; overflow: hidden; }
      .ksp-bp-edit { opacity: 0.55; }
      .ksp-bp-node:hover .ksp-bp-edit { opacity: 1; }
    `}</style>
  );
}
