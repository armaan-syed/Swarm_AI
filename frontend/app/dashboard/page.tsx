"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { SettingsButton } from "./components/SettingsButton";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { useCompany } from "@/lib/hooks/useCompany";
import { usePipelineRun } from "@/lib/hooks/usePipelineRun";
import { mockDashboardData } from "@/lib/mockData";

export default function DashboardPage() {
  const router = useRouter();
  const { company, isHydrated } = useCompany();
  const { state, runPipeline } = usePipelineRun();

  useEffect(() => {
    if (isHydrated && !company) {
      router.push("/onboarding/company");
    }
  }, [company, router, isHydrated]);

  if (!isHydrated || !company) {
    return null;
  }

  const handleRunPipeline = async () => {
    await runPipeline(company.id);
  };

  // Convert pipeline state agents to AgentCard format
  const agentCards = state.agents.map((agent) => ({
    id: agent.name,
    name: agent.label,
    status: agent.phase === "running" ? "running" : agent.phase === "success" ? "completed" : agent.phase === "error" ? "error" : "pending",
    timestamp: agent.finishedAt ? new Date(agent.finishedAt).toLocaleTimeString() : agent.startedAt ? new Date(agent.startedAt).toLocaleTimeString() : "Pending",
    reasoning: agent.currentThought || (agent.phase === "success" ? "Completed successfully" : agent.phase === "error" ? "Failed" : "Awaiting execution"),
  }));

  return (
    <div className="h-screen bg-[var(--color-neo-bg-alt)] flex flex-col font-sans overflow-hidden">
      <SettingsButton />
      <SettingsSidebar />
      <Navbar />

      <main className="flex-1 flex overflow-hidden p-6 gap-6 w-full max-w-[1920px] mx-auto">
        {/* Left Side: Agent Reasoning + Run Button */}
        <section className="w-[45%] flex flex-col gap-4 h-full relative">
          <div className="bg-[var(--color-neo-bg-inverse)] text-[var(--color-neo-fg-inverse)] p-4 border-[3px] border-[#0A0A0A] shadow-[4px_4px_0px_#0A0A0A] sticky top-0 z-10 flex justify-between items-center">
            <h2 className="font-display font-black text-2xl uppercase tracking-tighter">
              Agent Swarm Reasoning
            </h2>
            <div className="flex border-2 border-white">
              <span className={`px-2 py-0.5 font-bold font-mono text-xs uppercase ${state.status === "running" ? "bg-[#FFE500] text-[#0A0A0A] animate-pulse" : state.status === "done" ? "bg-[#BFFF00] text-[#0A0A0A]" : "bg-[#888] text-white"}`}>
                {state.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Run Button */}
          <div className="px-2">
            <Button
              variant="primary"
              size="xl"
              onClick={handleRunPipeline}
              disabled={state.status === "running"}
              className="w-full"
            >
              {state.status === "running" ? "PIPELINE RUNNING..." : "RUN COMPLIANCE CHECK →"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-5 pb-10">
            <div className="w-[2px] bg-[#0A0A0A] absolute left-[28px] top-[150px] bottom-10 z-0 hidden lg:block border-dashed border-r-2" />
            {agentCards.map((agent) => (
              <div key={agent.id} className="relative z-10">
                <AgentCard agent={agent as any} />
              </div>
            ))}
          </div>

          {state.error && (
            <div className="bg-[#FF4D4D] text-white border-[3px] border-[#0A0A0A] p-4 font-mono text-sm">
              {state.error}
            </div>
          )}
        </section>

        {/* Right Side: Report Panel */}
        <section className="w-[55%] h-full flex flex-col pl-4 border-l-[6px] border-[#0A0A0A] overflow-y-auto">
          {state.report ? (
            <div className="flex flex-col gap-6">
              {/* Regulation Header */}
              <Card variant="accent-yellow" className="!p-5">
                <h2 className="font-heading font-black text-2xl uppercase mb-1">
                  {state.report.markdown?.split("\n")[0] || "Compliance Report"}
                </h2>
                <div className="flex gap-3 font-mono text-xs font-bold mb-3">
                  <Badge variant="dark">{state.report.overall_severity || "MEDIUM"}</Badge>
                  <Badge variant="default">{state.report.citations?.length || 0} Citations</Badge>
                </div>
                <p className="font-sans font-medium text-sm border-l-4 border-[#0A0A0A] pl-3">
                  {state.validation ? `Validity: ${state.validation.is_valid ? "✓ Valid" : "⚠ Check required"} (${((state.validation.confidence || 0) * 100).toFixed(0)}% confident)` : "Processing..."}
                </p>
              </Card>

              {/* Report Content */}
              <Card className="flex-1 overflow-y-auto">
                <div className="prose prose-sm max-w-none prose-pre:bg-[#F5F0E8] prose-pre:border prose-pre:border-[#0A0A0A] prose-code:font-mono prose-code:text-sm">
                  <div className="whitespace-pre-wrap font-mono text-sm text-[#0A0A0A] leading-relaxed">
                    {state.report.markdown || "No report generated yet."}
                  </div>
                </div>
              </Card>

              {/* Action Items */}
              {state.report.action_items && state.report.action_items.length > 0 && (
                <Card className="!p-5">
                  <h3 className="font-heading font-black text-lg uppercase mb-4">Action Items</h3>
                  <ul className="flex flex-col gap-2">
                    {state.report.action_items.map((item, i) => (
                      <li key={i} className="font-mono text-sm flex gap-2">
                        <span className="font-bold">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          ) : (
            <Card variant="accent-lime" className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <p className="font-display text-2xl font-black mb-3">No Report Yet</p>
                <p className="font-mono text-sm text-[#3D3D3D]">
                  Click "RUN COMPLIANCE CHECK" to trigger the pipeline
                </p>
              </div>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
