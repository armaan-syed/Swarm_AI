"use client";

import { useRef, useState, useCallback } from "react";
import { useWorkflow } from "@/app/context/WorkflowContext";
import NodeCard from "./NodeCard";
import ConnectionLine from "./ConnectionLine";

export default function Canvas() {
  const { nodes, edges } = useWorkflow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.4, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 1 || (e.target as HTMLElement).closest(".node-card"))
        return;
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };

      const onMove = (ev: MouseEvent) => {
        if (!isPanning.current) return;
        setPan({
          x: ev.clientX - panStart.current.x,
          y: ev.clientY - panStart.current.y,
        });
      };
      const onUp = () => {
        isPanning.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [pan]
  );

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden bg-[#0b0b0e]"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{ cursor: "default" }}
    >
      {/* Grid */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="smallGrid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % 24},${
              pan.y % 24
            }) scale(${zoom})`}
          >
            <circle cx="12" cy="12" r="0.5" fill="rgba(255,255,255,0.07)" />
          </pattern>
          <pattern
            id="bigGrid"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % 120},${
              pan.y % 120
            }) scale(${zoom})`}
          >
            <rect width="120" height="120" fill="url(#smallGrid)" />
            <circle cx="60" cy="60" r="1" fill="rgba(255,255,255,0.12)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bigGrid)" />
      </svg>

      {/* Transform container */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          width: "2000px",
          height: "1200px",
        }}
      >
        {/* SVG layer for connections */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width="2000"
          height="1200"
          style={{ overflow: "visible" }}
        >
          <defs>
            <style>{`
              @keyframes dashFlow {
                to { stroke-dashoffset: -26; }
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </defs>
          {edges.map((edge) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;
            return (
              <ConnectionLine
                key={edge.id}
                edge={edge}
                fromNode={from}
                toNode={to}
              />
            );
          })}
        </svg>

        {/* Node cards */}
        {nodes.map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 z-10">
        {[
          { label: "+", action: () => setZoom((z) => Math.min(2, z + 0.1)) },
          { label: "−", action: () => setZoom((z) => Math.max(0.4, z - 0.1)) },
          {
            label: "⊙",
            action: () => {
              setZoom(1);
              setPan({ x: 40, y: 40 });
            },
          },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-8 h-8 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white/60 hover:text-white text-sm font-medium transition-all flex items-center justify-center"
          >
            {label}
          </button>
        ))}
        <div className="text-center text-[10px] text-white/30 mt-1">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Middle-click hint */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/20 pointer-events-none">
        Middle-click drag to pan · Scroll to zoom
      </div>
    </div>
  );
}
