"use client";

import { useWorkflow } from "@/app/context/WorkflowContext";

export default function Topbar() {
  const {
    workflowName,
    setWorkflowName,
    runWorkflow,
    resetWorkflow,
    isRunning,
  } = useWorkflow();

  return (
    <header className="h-14 bg-[#0f0f11]/80 backdrop-blur border-b border-white/[0.06] flex items-center px-4 gap-3 flex-shrink-0 z-20">
      {/* Workflow name */}
      <input
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        className="bg-transparent text-white/80 text-sm font-medium focus:outline-none focus:text-white border-b border-transparent focus:border-white/20 px-1 py-0.5 transition-all min-w-0 max-w-xs"
      />

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {["Save", "Export", "Import"].map((label) => (
          <button
            key={label}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all"
          >
            {label}
          </button>
        ))}

        <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-violet-300 hover:text-violet-200 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 hover:border-violet-400/30 transition-all">
          API Keys
        </button>

        <button
          onClick={isRunning ? resetWorkflow : runWorkflow}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            isRunning
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20"
          }`}
        >
          {isRunning ? (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              Stop
            </>
          ) : (
            <>
              <span>▶</span>
              Execute
            </>
          )}
        </button>
      </div>
    </header>
  );
}
