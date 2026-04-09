"use client";

import { NodeStatus } from "@/app/types/workflow";

interface Props {
  status: NodeStatus;
  x: number;
  y: number;
}

const statusConfig = {
  idle: {
    outer: "#ffffff10",
    inner: "#ffffff20",
    ring: "#ffffff15",
    pulse: false,
    label: "Agent idle",
  },
  running: {
    outer: "#7c3aed30",
    inner: "#8b5cf6",
    ring: "#a78bfa",
    pulse: true,
    label: "Agent running...",
  },
  success: {
    outer: "#05966920",
    inner: "#10b981",
    ring: "#34d399",
    pulse: false,
    label: "Agent completed",
  },
  error: {
    outer: "#dc262620",
    inner: "#ef4444",
    ring: "#f87171",
    pulse: false,
    label: "Agent failed",
  },
};

export default function AgentCircle({ status, x, y }: Props) {
  const cfg = statusConfig[status];

  return (
    <g transform={`translate(${x},${y})`} style={{ cursor: "default" }}>
      {/* Tooltip */}
      <title>{cfg.label}</title>

      {/* Outer glow ring */}
      <circle
        r="18"
        fill={cfg.outer}
        className={status === "running" ? "animate-ping" : ""}
        style={{ transformOrigin: "0 0", animationDuration: "1.4s" }}
      />

      {/* Spinning border (running only) */}
      {status === "running" && (
        <circle
          r="13"
          fill="none"
          stroke={cfg.ring}
          strokeWidth="1.5"
          strokeDasharray="20 22"
          strokeLinecap="round"
          style={{
            transformOrigin: "0 0",
            animation: "spin 1.2s linear infinite",
          }}
        />
      )}

      {/* Static ring */}
      {status !== "running" && (
        <circle
          r="12"
          fill="none"
          stroke={cfg.ring}
          strokeWidth="1"
          opacity={status === "idle" ? 0.25 : 0.7}
        />
      )}

      {/* Core dot */}
      <circle
        r="7"
        fill={cfg.inner}
        opacity={status === "idle" ? 0.35 : 1}
        style={
          status === "running"
            ? { filter: `drop-shadow(0 0 6px ${cfg.inner})` }
            : status === "success"
            ? { filter: `drop-shadow(0 0 5px ${cfg.inner})` }
            : {}
        }
      />

      {/* Status icon */}
      {status === "success" && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fill="white"
          fontWeight="bold"
        >
          ✓
        </text>
      )}
      {status === "error" && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fill="white"
          fontWeight="bold"
        >
          ✕
        </text>
      )}
      {status === "running" && (
        <circle
          r="2.5"
          fill="white"
          opacity="0.9"
          style={{ animation: "pulse 0.8s ease-in-out infinite" }}
        />
      )}
    </g>
  );
}
