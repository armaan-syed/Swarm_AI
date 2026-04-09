"use client";

import { useWorkflow } from "@/app/context/WorkflowContext";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function Sidebar() {
  const { sessions, activeSessionId, loadSession, newSession } = useWorkflow();

  return (
    <aside className="w-64 h-screen bg-[#0f0f11] border-r border-white/[0.06] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-500/30">
            A
          </div>
          <span className="font-semibold text-sm text-white/90 tracking-wide">
            AgentFlow
          </span>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 py-3">
        <button
          onClick={newSession}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/70 hover:text-white text-sm transition-all duration-200 group"
        >
          <span className="text-base leading-none group-hover:rotate-90 transition-transform duration-200">
            +
          </span>
          <span>New Workflow</span>
        </button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-3">
        <p className="text-[10px] font-medium text-white/25 uppercase tracking-widest px-2 py-2">
          Recent
        </p>
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => loadSession(session.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 group ${
              activeSessionId === session.id
                ? "bg-violet-500/15 border border-violet-500/25 text-white"
                : "hover:bg-white/[0.05] border border-transparent text-white/55 hover:text-white/80"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-sm mt-0.5 opacity-60">
                {activeSessionId === session.id ? "◆" : "◇"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">
                  {session.title}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {timeAgo(session.timestamp)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* User Profile */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-all">
          <div className="w-7 h-7 rounded-full bg-linear-to-br from-pink-500 to-orange-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">User</p>
            <p className="text-[10px] text-white/30">Free plan</p>
          </div>
          <span className="text-white/30 text-xs">⚙</span>
        </div>
      </div>
    </aside>
  );
}
