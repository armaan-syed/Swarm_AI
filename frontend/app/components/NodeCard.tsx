"use client";

import { useRef, useState, useCallback } from "react";
import { WorkflowNode, NodeStatus } from "@/app/types/workflow";
import { useWorkflow } from "@/app/context/WorkflowContext";

interface Props {
  node: WorkflowNode;
}

const statusStyles: Record<
  NodeStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  idle: {
    bg: "bg-white/[0.06]",
    text: "text-white/40",
    dot: "bg-white/30",
    label: "Idle",
  },
  running: {
    bg: "bg-violet-500/15",
    text: "text-violet-300",
    dot: "bg-violet-400",
    label: "Running",
  },
  success: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
    label: "Success",
  },
  error: {
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    dot: "bg-rose-400",
    label: "Error",
  },
};

const typeColors: Record<string, string> = {
  input: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
  scraper: "from-amber-500/20 to-amber-600/10 border-amber-500/20",
  llm: "from-violet-500/20 to-violet-600/10 border-violet-500/20",
  output: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20",
};

export default function NodeCard({ node }: Props) {
  const { setNodes, selectedNodeId, setSelectedNodeId } = useWorkflow();
  const [showModal, setShowModal] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, nx: 0, ny: 0 });

  const status = statusStyles[node.status];
  const gradient =
    typeColors[node.type] || "from-white/10 to-white/5 border-white/10";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      dragging.current = true;
      dragStart.current = {
        mx: e.clientX,
        my: e.clientY,
        nx: node.x,
        ny: node.y,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const dx = ev.clientX - dragStart.current.mx;
        const dy = ev.clientY - dragStart.current.my;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  x: Math.max(0, dragStart.current.nx + dx),
                  y: Math.max(0, dragStart.current.ny + dy),
                }
              : n
          )
        );
      };

      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [node.id, node.x, node.y, setNodes]
  );

  return (
    <>
      <div
        className={`absolute select-none rounded-2xl bg-gradient-to-br ${gradient} border backdrop-blur-sm shadow-xl cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
          selectedNodeId === node.id
            ? "ring-2 ring-violet-400/50 shadow-violet-500/20"
            : "hover:shadow-black/40"
        } ${node.status === "running" ? "shadow-violet-500/25" : ""}`}
        style={{ left: node.x, top: node.y, width: 180, minHeight: 72 }}
        onMouseDown={handleMouseDown}
        onClick={() => {
          setSelectedNodeId(node.id);
          setShowModal(true);
        }}
      >
        <div className="px-4 py-3.5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-xl leading-none">{node.icon}</span>
            <span className="text-xs font-semibold text-white/85 truncate flex-1">
              {node.title}
            </span>
          </div>

          {/* Status badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.text}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${status.dot} ${
                node.status === "running" ? "animate-pulse" : ""
              }`}
            />
            {status.label}
          </div>
        </div>

        {/* Running shimmer */}
        {node.status === "running" && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-transparent"
              style={{ animation: "shimmer 1.5s infinite" }}
            />
          </div>
        )}
      </div>

      {/* Config Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#16161a] border border-white/[0.1] rounded-2xl p-6 w-80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{node.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {node.title}
                </h3>
                <p className="text-xs text-white/40 capitalize">
                  {node.type} node
                </p>
              </div>
              <button
                className="ml-auto text-white/30 hover:text-white/60 text-lg leading-none"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {["Name", "Timeout (ms)", "Retry count"].map((field) => (
                <div key={field}>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">
                    {field}
                  </label>
                  <input
                    defaultValue={
                      field === "Name"
                        ? node.title
                        : field.includes("Timeout")
                        ? "5000"
                        : "3"
                    }
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-violet-500/40"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
                onClick={() => setShowModal(false)}
              >
                Save Config
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-white/60 text-xs transition-colors"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
