"use client";

import { useCallback, useState, useRef } from "react";
import { AgentName, PipelineState } from "@/app/types/workflow";
import * as complianceApi from "@/lib/api/compliance";
import { getAgentSequence } from "@/lib/agentThoughts";

const AGENT_SEQUENCE: AgentName[] = [
  "source_monitor",
  "document_extractor",
  "change_detector",
  "impact_mapper",
  "report_generator",
  "communication_agent",
];

const AGENT_LABELS: Record<AgentName, string> = {
  source_monitor: "Source Monitor",
  document_extractor: "Document Extractor",
  change_detector: "Change Detector",
  impact_mapper: "Impact Mapper",
  report_generator: "Report Generator",
  communication_agent: "Communication Agent",
};

// ─── LocalStorage history persistence ─────────────────────────────────────────
const HISTORY_KEY = "swarm_ai_report_history";

function saveToHistory(report: any) {
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const entry = {
      id: `report_${Date.now()}`,
      created_at: new Date().toISOString(),
      summary: report.markdown?.split("\n").find((l: string) => l.includes("Key Finding"))?.substring(0, 120) || report.markdown?.substring(0, 100) || "Regulatory Analysis",
      severity: report.overall_severity || "HIGH",
      affected_teams: report.affected_teams || [],
      markdown: report.markdown,
      citations: report.citations,
      action_items: report.action_items,
      grounded: report.grounded,
      overall_severity: report.overall_severity,
      email_drafts: report.email_drafts,
      metadata: report.metadata,
    };
    existing.unshift(entry);
    // Keep max 20 entries
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.slice(0, 20)));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function getLocalHistory(): any[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

// ─── Sleep utility ────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePipelineRun() {
  const [state, setState] = useState<PipelineState>({
    status: "idle",
    agents: AGENT_SEQUENCE.map((name) => ({
      name,
      label: AGENT_LABELS[name],
      phase: "idle",
      currentThought: null,
      startedAt: null,
      finishedAt: null,
    })),
    report: null,
    validation: null,
    error: null,
  });

  const abortRef = useRef(false);

  const runPipeline = useCallback(
    async (companyId: string) => {
      abortRef.current = false;

      // Reset state
      setState((prev) => ({
        ...prev,
        status: "running",
        error: null,
        agents: prev.agents.map((a) => ({
          ...a,
          phase: "idle",
          currentThought: null,
          startedAt: null,
          finishedAt: null,
        })),
        report: null,
        validation: null,
      }));

      // 1. Fire real backend in background (for logging/persistence)
      //    We don't wait for it — the prebaked report is the star
      complianceApi
        .runPipeline({ company_id: companyId, max_docs: 5 })
        .catch((err) => console.warn("[Background pipeline]", err));

      // 2. Fetch latest intelligence briefing
      let intelligenceData: any = null;
      try {
        const resp = await complianceApi.getLatestIntelligence();
        intelligenceData = resp.result;
      } catch (err) {
        console.error("Failed to fetch intelligence briefing:", err);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Failed to fetch compliance report. Check backend connection.",
        }));
        return;
      }

      // 3. Sequential agent processing analysis
      for (let agentIdx = 0; agentIdx < AGENT_SEQUENCE.length; agentIdx++) {
        if (abortRef.current) break;
        const agentName = AGENT_SEQUENCE[agentIdx];
        const thoughts = getAgentSequence(agentName);

        // Set this agent to running
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a, i) => ({
            ...a,
            phase: i === agentIdx ? "running" : i < agentIdx ? "success" : a.phase,
            startedAt: i === agentIdx ? Date.now() : a.startedAt,
            finishedAt: i < agentIdx && !a.finishedAt ? Date.now() : a.finishedAt,
          })),
        }));

        // Cycle through this agent's thoughts
        for (const thought of thoughts) {
          if (abortRef.current) break;
          setState((prev) => ({
            ...prev,
            agents: prev.agents.map((a, i) =>
              i === agentIdx ? { ...a, currentThought: thought.text } : a
            ),
          }));
          await sleep(thought.durationMs);
        }

        // Mark agent as completed
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a, i) =>
            i === agentIdx
              ? { ...a, phase: "success", finishedAt: Date.now(), currentThought: null }
              : a
          ),
        }));
      }

      // 4. Display the intelligence report
      if (intelligenceData) {
        const report = intelligenceData.report;
        const validation = intelligenceData.validation;

        // Save to audit history
        saveToHistory(report);

        setState((prev) => ({
          ...prev,
          status: "done",
          report: report,
          validation: validation,
          agents: prev.agents.map((agent) => ({
            ...agent,
            phase: "success",
            finishedAt: agent.finishedAt || Date.now(),
            currentThought: null,
          })),
        }));

        return intelligenceData; // Return so caller can send emails with fresh data
      } else {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Pipeline completed but no report was generated.",
        }));
        return null;
      }
    },
    []
  );

  const loadReport = useCallback((report: any) => {
    setState((prev) => ({
      ...prev,
      report: report,
      status: "done",
      agents: prev.agents.map((a) => ({ ...a, phase: "success" })),
    }));
  }, []);

  return { state, runPipeline, loadReport };
}
