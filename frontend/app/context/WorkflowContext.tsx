"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  WorkflowNode,
  Edge,
  ChatSession,
  ExecutionLog,
  NodeStatus,
} from "@/app/types/workflow";

const DEFAULT_NODES: WorkflowNode[] = [
  {
    id: "n1",
    title: "Data Input",
    type: "input",
    icon: "📥",
    status: "idle",
    x: 80,
    y: 200,
  },
  {
    id: "n2",
    title: "Web Scraper",
    type: "scraper",
    icon: "🌐",
    status: "idle",
    x: 320,
    y: 120,
  },
  {
    id: "n3",
    title: "LLM Task",
    type: "llm",
    icon: "🤖",
    status: "idle",
    x: 560,
    y: 200,
  },
  {
    id: "n4",
    title: "Output",
    type: "output",
    icon: "📤",
    status: "idle",
    x: 800,
    y: 200,
  },
];

const DEFAULT_EDGES: Edge[] = [
  { id: "e1", from: "n1", to: "n2", agentStatus: "idle" },
  { id: "e2", from: "n2", to: "n3", agentStatus: "idle" },
  { id: "e3", from: "n3", to: "n4", agentStatus: "idle" },
];

const DEFAULT_SESSIONS: ChatSession[] = [
  {
    id: "s1",
    title: "Web Research Pipeline",
    timestamp: new Date(Date.now() - 3600000),
    nodes: DEFAULT_NODES,
    edges: DEFAULT_EDGES,
  },
  {
    id: "s2",
    title: "Data Extraction Flow",
    timestamp: new Date(Date.now() - 86400000),
    nodes: [],
    edges: [],
  },
  {
    id: "s3",
    title: "Content Generation",
    timestamp: new Date(Date.now() - 172800000),
    nodes: [],
    edges: [],
  },
];

interface WorkflowContextType {
  nodes: WorkflowNode[];
  edges: Edge[];
  sessions: ChatSession[];
  activeSessionId: string;
  executionLogs: ExecutionLog[];
  isRunning: boolean;
  workflowName: string;
  setWorkflowName: (name: string) => void;
  setNodes: React.Dispatch<React.SetStateAction<WorkflowNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  updateNodeStatus: (id: string, status: NodeStatus) => void;
  updateEdgeStatus: (id: string, status: NodeStatus) => void;
  runWorkflow: () => void;
  resetWorkflow: () => void;
  loadSession: (sessionId: string) => void;
  newSession: () => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  testInput: string;
  setTestInput: (v: string) => void;
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<Edge[]>(DEFAULT_EDGES);
  const [sessions, setSessions] = useState<ChatSession[]>(DEFAULT_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState("s1");
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [workflowName, setWorkflowName] = useState("Web Research Pipeline");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [testInput, setTestInput] = useState(
    '{"query": "latest AI news", "depth": 3}'
  );

  const updateNodeStatus = useCallback((id: string, status: NodeStatus) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, status } : n)));
  }, []);

  const updateEdgeStatus = useCallback((id: string, status: NodeStatus) => {
    setEdges((prev) =>
      prev.map((e) => (e.id === id ? { ...e, agentStatus: status } : e))
    );
  }, []);

  const runWorkflow = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setExecutionLogs([]);

    // Reset all
    setNodes((prev) => prev.map((n) => ({ ...n, status: "idle" })));
    setEdges((prev) => prev.map((e) => ({ ...e, agentStatus: "idle" })));

    const runNode = async (node: WorkflowNode, delay: number) => {
      await new Promise((r) => setTimeout(r, delay));
      updateNodeStatus(node.id, "running");

      const start = Date.now();
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

      const success = Math.random() > 0.15;
      const status: NodeStatus = success ? "success" : "error";
      updateNodeStatus(node.id, status);

      setExecutionLogs((prev) => [
        ...prev,
        {
          nodeId: node.id,
          nodeTitle: node.title,
          status,
          message: success ? `Completed successfully` : `Failed: timeout`,
          duration: Date.now() - start,
          timestamp: new Date(),
        },
      ]);
    };

    const runEdge = async (edge: Edge, delay: number) => {
      await new Promise((r) => setTimeout(r, delay + 400));
      updateEdgeStatus(edge.id, "running");
      await new Promise((r) => setTimeout(r, 800));
      updateEdgeStatus(edge.id, "success");
    };

    // Run sequentially with overlapping animations
    const nodeList = [...nodes];
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      const edgeOut = edges.find((e) => e.from === node.id);
      await runNode(node, 0);
      if (edgeOut) await runEdge(edgeOut, 0);
    }

    setIsRunning(false);
  }, [isRunning, nodes, edges, updateNodeStatus, updateEdgeStatus]);

  const resetWorkflow = useCallback(() => {
    setNodes((prev) => prev.map((n) => ({ ...n, status: "idle" })));
    setEdges((prev) => prev.map((e) => ({ ...e, agentStatus: "idle" })));
    setExecutionLogs([]);
  }, []);

  const loadSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      setActiveSessionId(sessionId);
      setWorkflowName(session.title);
      if (session.nodes.length > 0) {
        setNodes(session.nodes);
        setEdges(session.edges);
      }
      resetWorkflow();
    },
    [sessions, resetWorkflow]
  );

  const newSession = useCallback(() => {
    const id = `s${Date.now()}`;
    const session: ChatSession = {
      id,
      title: "New Workflow",
      timestamp: new Date(),
      nodes: DEFAULT_NODES.map((n) => ({ ...n })),
      edges: DEFAULT_EDGES.map((e) => ({ ...e })),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(id);
    setWorkflowName("New Workflow");
    setNodes(DEFAULT_NODES.map((n) => ({ ...n, status: "idle" })));
    setEdges(DEFAULT_EDGES.map((e) => ({ ...e, agentStatus: "idle" })));
    setExecutionLogs([]);
  }, []);

  return (
    <WorkflowContext.Provider
      value={{
        nodes,
        edges,
        sessions,
        activeSessionId,
        executionLogs,
        isRunning,
        workflowName,
        setWorkflowName,
        setNodes,
        setEdges,
        updateNodeStatus,
        updateEdgeStatus,
        runWorkflow,
        resetWorkflow,
        loadSession,
        newSession,
        selectedNodeId,
        setSelectedNodeId,
        testInput,
        setTestInput,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider");
  return ctx;
}
