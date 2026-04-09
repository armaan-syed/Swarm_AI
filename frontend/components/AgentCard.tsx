import React from "react";
import { Card } from "./Card";
import { Badge } from "./Badge";

interface Agent {
  id: string;
  name: string;
  status: "completed" | "running" | "pending" | "error";
  timestamp: string;
  reasoning: string;
}

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const statusConfig = {
    completed: { label: "Completed", variant: "success", icon: "🟢" },
    running: { label: "Running", variant: "warning", icon: "🟡" },
    pending: { label: "Pending", variant: "default", icon: "⚪" },
    error: { label: "Needs Attention", variant: "error", icon: "🔴" }
  } as const;

  const config = statusConfig[agent.status];

  return (
    <Card className="flex flex-col gap-3 relative pb-8">
      <div className="flex justify-between items-start">
        <h3 className="font-heading font-black text-lg uppercase tracking-tight">
          {agent.name}
        </h3>
        <Badge variant={config.variant as any} className="gap-1 items-center">
          <span>{config.icon}</span>
          {config.label}
        </Badge>
      </div>
      <p className="font-mono text-sm text-[var(--color-neo-fg-muted)] leading-relaxed">
        {agent.reasoning}
      </p>
      <div className="absolute bottom-3 right-4 font-mono text-xs text-[#888] font-bold">
        {agent.timestamp}
      </div>
    </Card>
  );
}
