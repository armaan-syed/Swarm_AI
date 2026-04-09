"use client";

import { useWorkflow } from "@/app/context/WorkflowContext";
import { NodeStatus } from "@/app/types/workflow";

const statusIcon: Record<NodeStatus, string> = {
  idle: "○",
  running: "◎",
  success: "✓",
  error: "✕",
};

const statusColor: Record<NodeStatus, string> = {
  idle: "text-white/30",
  running: "text-violet-400",
  success: "text-emerald-400",
  error: "text-rose-400",
};

export default function RightPanel() {
  const {
    nodes,
    executionLogs,
    isRunning,
    runWorkflow,
    resetWorkflow,
    testInput,
    setTestInput,
  } = useWorkflow();

  return (
    <aside className="w-72 h-screen bg-[#0f0f11] border-l border-white/[0.06] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <h2 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
          Execution Panel
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Run section */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex gap-2">
            <button
              onClick={runWorkflow}
              disabled={isRunning}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
            >
              {isRunning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Running...
                </>
              ) : (
                <> ▶ Run Workflow</>
              )}
            </button>
            <button
              onClick={resetWorkflow}
              className="px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.06] text-white/50 hover:text-white/80 text-xs transition-all"
            >
              ↺
            </button>
          </div>

          {/* Step progress */}
          {(isRunning || executionLogs.length > 0) && (
            <div className="mt-3 space-y-1">
              {nodes.map((node, i) => (
                <div key={node.id} className="flex items-center gap-2.5">
                  <div
                    className={`text-sm font-mono leading-none ${
                      statusColor[node.status]
                    }`}
                  >
                    {statusIcon[node.status]}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-xs ${
                        node.status !== "idle"
                          ? "text-white/70"
                          : "text-white/25"
                      }`}
                    >
                      {node.title}
                    </div>
                  </div>
                  {node.status === "running" && (
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Execution logs */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-3">
            Logs
          </h3>
          {executionLogs.length === 0 ? (
            <p className="text-[11px] text-white/20 italic">
              No logs yet. Run the workflow.
            </p>
          ) : (
            <div className="space-y-2">
              {executionLogs.map((log, i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-mono ${
                        statusColor[log.status]
                      }`}
                    >
                      {statusIcon[log.status]}
                    </span>
                    <span className="text-[11px] font-medium text-white/70">
                      {log.nodeTitle}
                    </span>
                    {log.duration && (
                      <span className="ml-auto text-[10px] text-white/25">
                        {log.duration}ms
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Testing panel */}
        <div className="px-4 py-4">
          <h3 className="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-3">
            Test Input
          </h3>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={5}
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-[11px] text-white/60 font-mono focus:outline-none focus:border-violet-500/30 resize-none"
            placeholder='{"key": "value"}'
          />
          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className="mt-2.5 w-full py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white/60 hover:text-white/80 text-xs font-medium transition-all disabled:opacity-40"
          >
            Run Test
          </button>
        </div>
      </div>
    </aside>
  );
}
