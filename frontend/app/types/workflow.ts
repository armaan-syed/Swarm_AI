import type { ReportOut, ValidationOut } from "./api";

export type NodeStatus = "idle" | "running" | "success" | "error";
export type AgentName =
  | "source_monitor"
  | "document_extractor"
  | "change_detector"
  | "impact_mapper"
  | "report_generator"
  | "communication_agent";

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

export interface AgentNodeState {
  name: AgentName;
  label: string;
  phase: NodeStatus;
  currentThought: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface PipelineState {
  status: "idle" | "running" | "done" | "error";
  agents: AgentNodeState[];
  report: ReportOut | null;
  validation: ValidationOut | null;
  error: string | null;
}

