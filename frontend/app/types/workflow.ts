export type NodeStatus = "idle" | "running" | "success" | "error";

export interface WorkflowNode {
  id: string;
  title: string;
  type: string;
  icon: string;
  status: NodeStatus;
  x: number;
  y: number;
  config?: Record<string, string>;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  agentStatus: NodeStatus;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  nodes: WorkflowNode[];
  edges: Edge[];
}

export interface ExecutionLog {
  nodeId: string;
  nodeTitle: string;
  status: NodeStatus;
  message: string;
  duration?: number;
  timestamp: Date;
}
