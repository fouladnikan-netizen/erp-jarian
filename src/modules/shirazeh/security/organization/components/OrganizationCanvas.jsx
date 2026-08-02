import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { findNodeById, layoutOrganizationFlow } from '../treeUtils';
import { useOrganizationStore } from '../store/organizationStore';
import { organizationNodeTypes } from './OrganizationNode';

function OrganizationCanvasInner() {
  const tree = useOrganizationStore((s) => s.tree);
  const selectedNodeId = useOrganizationStore((s) => s.selectedNodeId);
  const selectNode = useOrganizationStore((s) => s.selectNode);
  const setDragging = useOrganizationStore((s) => s.setDragging);
  const relocateNode = useOrganizationStore((s) => s.relocateNode);
  const { fitView, getIntersectingNodes } = useReactFlow();

  const layout = useMemo(() => layoutOrganizationFlow(tree), [tree]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const nextNodes = layout.nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    }));
    setNodes(nextNodes);
    setEdges(layout.edges);
    const timer = window.setTimeout(() => {
      fitView({ padding: 0.22, duration: 260 });
    }, 30);
    return () => window.clearTimeout(timer);
    // fitView from useReactFlow is not referentially stable — omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [layout, selectedNodeId, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onNodeDragStart = useCallback(
    (_event, node) => {
      setDragging(node.id);
    },
    [setDragging],
  );

  const onNodeDragStop = useCallback(
    (_event, node) => {
      setDragging(null);
      if (node.id === 'root') {
        setNodes(layout.nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })));
        return;
      }

      const intersections = getIntersectingNodes(node).filter(
        (item) => item.id !== node.id && item.type === 'orgDepartment',
      );

      if (!intersections.length) {
        setNodes(layout.nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })));
        return;
      }

      const target = [...intersections].sort((a, b) => b.position.y - a.position.y)[0];
      const targetDept = findNodeById(useOrganizationStore.getState().tree, target.id);
      if (!targetDept || targetDept.type !== 'department') {
        setNodes(layout.nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })));
        return;
      }

      const result = relocateNode(node.id, target.id);
      if (!result?.moved) {
        setNodes(layout.nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })));
      }
    },
    [
      getIntersectingNodes,
      layout.nodes,
      relocateNode,
      selectedNodeId,
      setDragging,
      setNodes,
    ],
  );

  return (
    <div className="org-canvas org-canvas--flow" style={{ width: '100%', height: 700, minHeight: 700, position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={organizationNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        fitView
        minZoom={0.35}
        maxZoom={1.6}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        style={{ width: '100%', height: '100%' }}
      >
        <Background gap={18} color="rgba(148, 163, 184, 0.35)" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(248, 250, 252, 0.7)"
          nodeColor={(node) => (node.type === 'orgUser' ? '#0d9488' : '#64748b')}
        />
      </ReactFlow>
    </div>
  );
}

export default function OrganizationCanvas() {
  return (
    <ReactFlowProvider>
      <OrganizationCanvasInner />
    </ReactFlowProvider>
  );
}
