"use client";

import { WorkflowNode, Edge } from "@/app/types/workflow";
import AgentCircle from "./AgentCircle";

interface Props {
  edge: Edge;
  fromNode: WorkflowNode;
  toNode: WorkflowNode;
}

const NODE_W = 180;
const NODE_H = 72;

export default function ConnectionLine({ edge, fromNode, toNode }: Props) {
  const x1 = fromNode.x + NODE_W;
  const y1 = fromNode.y + NODE_H / 2;
  const x2 = toNode.x;
  const y2 = toNode.y + NODE_H / 2;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cp1x = x1 + (x2 - x1) * 0.4;
  const cp2x = x1 + (x2 - x1) * 0.6;

  const path = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;

  const isActive = edge.agentStatus === "running";
  const isSuccess = edge.agentStatus === "success";
  const isError = edge.agentStatus === "error";

  const lineColor = isActive
    ? "#8b5cf6"
    : isSuccess
    ? "#10b981"
    : isError
    ? "#ef4444"
    : "rgba(255,255,255,0.12)";

  return (
    <g>
      {/* Glow path (active only) */}
      {isActive && (
        <path
          d={path}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="8"
          opacity="0.15"
          strokeLinecap="round"
        />
      )}

      {/* Main path */}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={isActive ? 2 : 1.5}
        strokeLinecap="round"
        strokeDasharray={isActive ? "8 5" : undefined}
        style={
          isActive
            ? {
                animation: "dashFlow 0.6s linear infinite",
                strokeDashoffset: 0,
              }
            : undefined
        }
      />

      {/* Arrowhead */}
      <polygon
        points={`${x2 - 8},${y2 - 5} ${x2},${y2} ${x2 - 8},${y2 + 5}`}
        fill={lineColor}
        opacity={0.7}
      />

      {/* Agent circle at midpoint */}
      <AgentCircle status={edge.agentStatus} x={mx} y={my} />
    </g>
  );
}
