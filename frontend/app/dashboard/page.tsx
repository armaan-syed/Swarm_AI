"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { SettingsButton } from "./components/SettingsButton";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { ComplianceChat } from "@/components/ComplianceChat";
import { ComplianceTimeline } from "@/components/ComplianceTimeline";
import { useCompany } from "@/lib/hooks/useCompany";
import { usePipelineRun } from "@/lib/hooks/usePipelineRun";
import { useDepartments } from "@/lib/hooks/useDepartments";
import { useSearchParams } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isIndexing = searchParams.get("status") === "indexing";
  const { company, isHydrated } = useCompany();
  const { state, runPipeline, loadReport } = usePipelineRun();
  const { departments } = useDepartments(company?.id);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"report" | "timeline" | "briefing" | "history">("report");

  // Extract all unique departments from the report
  const allDepartments = state.report?.affected_teams || [];

  useEffect(() => {
    if (isHydrated && !company) {
      router.push("/onboarding/company");
    }
  }, [company, router, isHydrated]);

  const fetchHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { getReportHistory } = await import("@/lib/api/compliance");
      const history = await getReportHistory();
      setHistoryItems(history);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  if (!isHydrated || !company) {
    return (
      <div className="h-screen bg-[var(--color-neo-bg-alt)] flex items-center justify-center font-mono">
        <div className="animate-pulse">Loading Swarm Intelligence...</div>
      </div>
    );
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
    <div className="h-screen bg-[var(--color-neo-bg-alt)] flex flex-col font-sans overflow-hidden relative">
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
          {isIndexing && (
            <div className="bg-[#0066FF] text-white p-3 border-[3px] border-black shadow-[4px_4px_0px_#0A0A0A] mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                <p className="font-mono text-xs font-black uppercase tracking-tighter">
                  Agents are indexing your Knowledge Base... 
                </p>
              </div>
              <Badge variant="dark" className="border-white text-[9px] cursor-pointer" onClick={() => router.replace('/dashboard')}>DISMISS</Badge>
            </div>
          )}
          {/* Live Regulatory Source Status */}
          <Card variant="default" className="!p-4 mb-4 bg-[#F5F5F5] border-dashed">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-heading font-black text-xs uppercase tracking-widest text-[#555]">
                  Live System Status
                </h3>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                    <span className="w-2 h-2 bg-[#BFFF00] rounded-full animate-pulse"></span>
                    RBI.ORG.IN: <span className="text-[#0066FF]">CONNECTED</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                    <span className="w-2 h-2 bg-[#BFFF00] rounded-full animate-pulse"></span>
                    SEBI.GOV.IN: <span className="text-[#0066FF]">CONNECTED</span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunPipeline}
                disabled={state.status === "running"}
                className="bg-white text-[10px] py-1 border-2 border-black h-8"
              >
                SCAN LIVE SOURCES ↻
              </Button>
            </div>
          </Card>

          {state.report ? (
            <div className="flex flex-col gap-6">
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

              {/* Enhanced Tab Switcher */}
              <div className="flex border-b-[3px] border-black overflow-x-auto scrollbar-hide">
                {[
                  { id: "report", label: "📄 Deep Report", color: "bg-[#FFE500]" },
                  { id: "timeline", label: "🗓 Roadmap", color: "bg-[#BFFF00]" },
                  { id: "briefing", label: "👤 Team Briefing", color: "bg-[#0066FF]" },
                  { id: "history", label: "🕒 History", color: "bg-[#FF4600]" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 font-heading font-black text-xs uppercase transition-all border-t-[3px] border-x-[3px] border-black mr-[-3px] flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                      ? `${tab.color} text-black -translate-y-1 shadow-[0px_4px_0px_white]`
                      : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                  >
                    {tab.label}
                    {tab.id === 'briefing' && state.report?.email_drafts?.length && (
                      <span className="bg-red-500 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center animate-bounce">
                        {state.report.email_drafts.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT: REPORT */}
              {activeTab === "report" && (
                <>
                  {allDepartments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      <button
                        onClick={() => setSelectedDept(null)}
                        className={`px-3 py-1 font-mono text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000] transition-all whitespace-nowrap ${selectedDept === null ? "bg-[#BFFF00] -translate-y-0.5" : "bg-white hover:bg-gray-100"
                          }`}
                      >
                        ALL DEPTS
                      </button>
                      {allDepartments.map((dept) => (
                        <button
                          key={dept}
                          onClick={() => setSelectedDept(dept)}
                          className={`px-3 py-1 font-mono text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000] transition-all whitespace-nowrap ${selectedDept === dept ? "bg-[#0066FF] text-white -translate-y-0.5" : "bg-white hover:bg-gray-100"
                            }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  )}

                  <Card className="flex-1 overflow-y-auto relative bg-[#FFFEF2]">
                    <div className="absolute top-4 right-4 opacity-10 font-black text-4xl pointer-events-none select-none">
                      CONFIDENTIAL
                    </div>
                    <div className="prose prose-sm max-w-none prose-pre:bg-[#F5F0E8] prose-pre:border prose-pre:border-[#0A0A0A] prose-code:font-mono prose-code:text-sm p-2">
                      <div className="whitespace-pre-wrap font-mono text-sm text-[#0A0A0A] leading-relaxed">
                        {state.report.markdown?.split(/(\*\*.*?\*\*|Clause \d+\.\d+|OLD POLICY:|NEW POLICY:|HIGH|MEDIUM|LOW)/g).map((part, i) => {
                          if (part.startsWith("Clause"))
                            return (
                              <a
                                key={i}
                                href={state.report?.metadata?.url || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#FFE500] border-2 border-black px-1.5 py-0.5 font-black mx-1 shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-all inline-block no-underline"
                                title="View RBI Source"
                              >
                                {part} ↗
                              </a>
                            );
                          if (part === "OLD POLICY:")
                            return <span key={i} className="text-[#888] line-through font-bold">{part}</span>;
                          if (part === "NEW POLICY:")
                            return <span key={i} className="bg-[#0066FF] text-white px-2 py-0.5 italic font-black mx-1">{part}</span>;
                          if (part === "HIGH")
                            return <span key={i} className="bg-[#FF4D4D] text-white px-1.5 py-0.5 font-black border-2 border-black shadow-[2px_2px_0px_#000]">{part}</span>;
                          if (part === "MEDIUM")
                            return <span key={i} className="bg-[#FFA500] text-black px-1.5 py-0.5 font-black border-2 border-black shadow-[2px_2px_0px_#000]">{part}</span>;
                          if (part.startsWith("**") && part.endsWith("**"))
                            return <span key={i} className="font-black text-lg underline decoration-[3px] decoration-[#BFFF00] underline-offset-4">{part.replace(/\*\*/g, '')}</span>;
                          return part;
                        })}
                      </div>
                    </div>
                  </Card>

                  {state.report.action_items && state.report.action_items.length > 0 && (
                    <Card className="!p-5">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-heading font-black text-lg uppercase">Action Items</h3>
                        {selectedDept && (
                          <Badge variant="dark" className="bg-[#0066FF]">FILTERED BY: {selectedDept}</Badge>
                        )}
                      </div>
                      <ul className="flex flex-col gap-2">
                        {state.report.action_items
                          .filter(item => !selectedDept || item.toLowerCase().includes(selectedDept.toLowerCase()) || item.toLowerCase().includes("all teams") || item.toLowerCase().includes("compliance"))
                          .map((item, i) => (
                            <li key={i} className="font-mono text-sm flex gap-2">
                              <span className="font-bold text-[#0066FF]">[ACTION]</span>
                              <span>{item}</span>
                            </li>
                          ))}
                      </ul>
                    </Card>
                  )}
                </>
              )}

              {/* TAB CONTENT: TIMELINE */}
              {activeTab === "timeline" && (
                <ComplianceTimeline
                  effectiveDate={state.report?.metadata?.effective_date || "MAY 2024"}
                  items={state.report.action_items.map((item, i) => ({
                    title: item,
                    date: i === 0 ? "Week 1: Immediate" : i === 1 ? "Week 2: Audit" : "Month 1: Policy Update",
                    status: i === 0 ? "pending" : "pending",
                    department: i % 2 === 0 ? "Strategic Oversight" : "Operations",
                    person: i % 2 === 0 ? "John Philji" : "Chris Fernandes"
                  }))}
                />
              )}

              {/* TAB CONTENT: BRIEFING */}
              {activeTab === "briefing" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#0066FF] text-white p-4 border-[3px] border-black shadow-[4px_4px_0px_#0A0A0A]">
                    <h3 className="font-heading font-black text-lg uppercase">AI Communication Swarm</h3>
                    <p className="font-mono text-[10px] opacity-80 uppercase tracking-widest mt-1">
                      Llama 3.2 generated {state.report.email_drafts?.length || 0} personalized briefings
                    </p>
                  </div>
                  {state.report.email_drafts?.map((draft: any, i: number) => (
                    <Card key={i} className="!p-4 bg-white border-dashed shadow-[4px_4px_0px_#0A0A0A]">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-heading font-bold text-xs uppercase text-[#555]">TO: {draft.name}</p>
                          <p className="font-mono text-[9px] text-[#0066FF]">{draft.to}</p>
                        </div>
                        <Badge variant="dark" className="bg-[#BFFF00] text-black border-2 border-black">SENT via RESEND</Badge>
                      </div>
                      <div className="bg-[#F5F5F5] p-3 border-2 border-black font-mono text-[11px] whitespace-pre-wrap">
                        <p className="font-black mb-2 border-b-2 border-black pb-1">Subject: {draft.subject}</p>
                        {draft.body}
                      </div>
                    </Card>
                  ))}
                  {(!state.report.email_drafts || state.report.email_drafts.length === 0) && (
                    <p className="font-mono text-xs text-[#888] italic text-center py-10 bg-white border-2 border-dashed border-black">
                      No email briefings were generated for this report. <br/>
                      <span className="text-[10px] opacity-70">(Try scanning a live source with personalized teams enabled)</span>
                    </p>
                  )}
                </div>
              )}

              {/* TAB CONTENT: HISTORY */}
              {activeTab === "history" && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-heading font-black text-xl uppercase tracking-tighter">Regulatory Audit History</h3>
                    <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={isLoadingHistory} className="text-[10px] font-black underline p-0">REFRESH ↻</Button>
                  </div>
                  
                  <div className="flex flex-col gap-3 pb-10">
                    {isLoadingHistory ? (
                      <div className="py-20 text-center font-mono text-sm">Accessing audit logs...</div>
                    ) : historyItems.length > 0 ? (
                      historyItems.map((item, idx) => {
                        const isCurrent = state.report?.id === item.id;
                        return (
                          <Card 
                            key={item.id} 
                            onClick={() => {
                              loadReport(item);
                              setActiveTab("report");
                            }}
                            className={`!p-4 border-[3px] border-black flex justify-between items-center group cursor-pointer hover:-translate-y-1 transition-all shadow-[4px_4px_0px_#0A0A0A] ${isCurrent ? 'bg-[#BFFF00]' : 'bg-white'}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="dark" className="border-2 border-black text-[9px] px-1 py-0">v{historyItems.length - idx}.0</Badge>
                                {isCurrent && <Badge variant="default" className="bg-black text-white text-[9px] px-1 py-0">VIEWING</Badge>}
                                <span className="font-mono text-[9px] text-[#888]">{new Date(item.created_at).toLocaleString()}</span>
                              </div>
                              <h4 className="font-heading font-black text-sm uppercase leading-tight line-clamp-1">
                                {item.summary || "Regulatory Analysis"}
                              </h4>
                              <div className="flex gap-2 mt-2">
                                <span className={`text-[8px] font-black uppercase px-1 border border-black ${item.severity === 'HIGH' ? 'bg-[#FF4D4D] text-white' : 'bg-[#FFE500]'}`}>
                                  {item.severity}
                                </span>
                                <span className="text-[8px] font-mono text-[#555]">
                                  {item.affected_teams?.length || 0} DEPTS AFFECTED
                                </span>
                              </div>
                            </div>
                            <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="py-20 text-center border-2 border-dashed border-black bg-white">
                        <p className="font-mono text-xs text-[#888]">No historical reports found.</p>
                        <p className="font-mono text-[10px] text-[#AAA] mt-1 italic">Scan a regulatory source to build your audit trail.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : state.status === "running" ? (
            <Card variant="accent-blue" className="flex items-center justify-center min-h-[400px] border-dashed border-4 border-black">
              <div className="text-center px-8">
                <div className="w-16 h-16 border-[6px] border-[#0A0A0A] border-t-[#BFFF00] animate-spin mx-auto mb-6"></div>
                <p className="font-display text-2xl font-black mb-3 uppercase italic">Synthesizing Intel...</p>
                <div className="bg-[#0A0A0A] text-white p-3 font-mono text-[10px] break-all border-2 border-[#0A0A0A] text-left">
                  <p className="text-[#BFFF00] mb-1 tracking-widest uppercase font-black">AI Swarm Activity:</p>
                  {state.agents.find(a => a.phase === 'running')?.currentThought || "Cross-referencing Regulatory clauses..."}
                </div>
                <p className="font-mono text-[11px] mt-4 text-[#3D3D3D]">
                  Llama 3.2 is performing multi-agent contrastive analysis against LIC 2023 history.
                </p>
              </div>
            </Card>
          ) : (
            <Card variant="accent-lime" className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <p className="font-display text-2xl font-black mb-3">No Report Yet</p>
                <p className="font-mono text-sm text-[#3D3D3D]">
                  Click "SCAN LIVE SOURCES" to trigger the pipeline
                </p>
              </div>
            </Card>
          )}
        </section>
      </main>

      {/* Persistence & Knowledge Hub Section */}
      <footer className="px-6 pb-6 mt-[-1rem]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[1920px] mx-auto">
          {/* Company Context Card */}
          <Card variant="accent-blue" className="!p-5 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -rotate-12 translate-x-16 -translate-y-16 group-hover:bg-white/20 transition-all"></div>
            <h3 className="font-heading font-black text-lg uppercase mb-2 flex items-center gap-2">
              <span>🏢</span> Company Intelligence Profile
            </h3>
            <p className="font-mono text-[11px] mb-4 opacity-90 line-clamp-2">
              Ollama is currently grounded using: <br />
              <span className="font-bold underline italic">"{company.product_description || 'No description provided'}"</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/onboarding/company")}
              className="bg-white text-black border-2 border-black"
            >
              EDIT DESCRIPTION
            </Button>
          </Card>

          {/* Document Upload Card */}
          <Card variant="accent-yellow" className="!p-5 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rotate-12 translate-x-16 -translate-y-16 group-hover:bg-black/10 transition-all"></div>
            <h3 className="font-heading font-black text-lg uppercase mb-2 flex items-center gap-2">
              <span>📂</span> Knowledge Base Hub
            </h3>
            <p className="font-mono text-[11px] mb-4 opacity-90">
              Provide more policy documents to improve Agentic precision and grounding.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/onboarding/documents")}
            >
              UPLOAD NEW POLICIES
            </Button>
          </Card>
        </div>
      </footer>

      {/* Compliance Chat System */}
      <ComplianceChat
        companyId={company.id}
        context={state.report?.markdown?.substring(0, 1000)}
      />
    </div>
  );
}
