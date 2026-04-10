"use client";

import { useCallback, useState } from "react";
import { AgentName, PipelineState } from "@/app/types/workflow";
import { PipelineRunOut } from "@/app/types/api";
import * as complianceApi from "@/lib/api/compliance";
import { getRandomThought } from "@/lib/agentThoughts";

const AGENT_SEQUENCE: AgentName[] = [
  "source_monitor",
  "document_extractor",
  "change_detector",
  "impact_mapper",
  "report_generator",
];

const AGENT_LABELS: Record<AgentName, string> = {
  source_monitor: "Source Monitor",
  document_extractor: "Document Extractor",
  change_detector: "Change Detector",
  impact_mapper: "Impact Mapper",
  report_generator: "Report Generator",
};



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

  const runPipeline = useCallback(
    async (companyId: string) => {
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

      // Trigger backend pipeline (fire and forget)
      const backendPromise = complianceApi
        .runPipeline({
          company_id: companyId,
          max_docs: 5,
        })
        .catch((err) => {
          console.error("Pipeline error:", err);
          return null;
        });



      // Set all agents to 'running' to show work has started
      setState((prev) => ({
        ...prev,
        agents: prev.agents.map((agent) => ({
          ...agent,
          phase: "running",
          startedAt: Date.now(),
        })),
      }));

      // Rotate thoughts across all agents every 600ms to keep UI alive while waiting for LLM
      const thoughtInterval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((agent) => ({
            ...agent,
            currentThought: agent.phase === "running" ? getRandomThought(agent.name) : agent.currentThought,
          })),
        }));
      }, 250);

      // Wait for real backend response (max 6 minutes to allow for slow Ollama generation)
      const result = await Promise.race([
        backendPromise,
        new Promise((resolve) => setTimeout(resolve, 360000)),
      ]);

      clearInterval(thoughtInterval);


      if (result && typeof result === "object") {
        const pipelineResult = result as PipelineRunOut;
        const firstReport = pipelineResult.reports[0];

        setState((prev) => ({
          ...prev,
          status: "done",
          report: firstReport?.report || null,
          validation: firstReport?.validation || null,
          agents: prev.agents.map((agent) => ({
            ...agent,
            phase: "success",
            finishedAt: Date.now(),
            currentThought: null,
          })),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Pipeline did not return results",
          agents: prev.agents.map((agent) => ({
            ...agent,
            phase: "idle",
            currentThought: null,
          })),
        }));
      }
    },
    []
  );

  return { state, runPipeline };
}
