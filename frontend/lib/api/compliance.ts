import { apiClient } from "./client";
import {
  RunPipelineRequest,
  PipelineRunOut,
  ImpactReportOut,
  CircularOut,
  StatsOut,
} from "@/app/types/api";

export async function runPipeline(
  payload: RunPipelineRequest
): Promise<PipelineRunOut> {
  return apiClient.post<PipelineRunOut>("/compliance/run", payload);
}

export async function runOne(url: string, source = "RBI"): Promise<unknown> {
  return apiClient.post("/compliance/run-one", { url, source });
}

/** Fetch the latest optimized compliance intelligence briefing. */
export async function getLatestIntelligence(): Promise<{ success: boolean; result: any }> {
  try {
    return await apiClient.get<{ success: boolean; result: any }>("/compliance/optimized");
  } catch (err: any) {
    if (err?.status === 404) {
      return apiClient.get<{ success: boolean; result: any }>("/compliance/prebaked");
    }
    throw err;
  }
}

/** Dispatch compliance briefings to all departments via the primary engine. */
export async function sendAlerts(payload: {
  email_drafts: any[];
  extra_recipients?: { name: string; email: string }[];
}): Promise<{ success: boolean; dispatched: number; results: any[] }> {
  return apiClient.post("/compliance/send-alerts", payload);
}

export async function listReports(
  limit = 20,
  severity?: string
): Promise<ImpactReportOut[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (severity) params.set("severity", severity);
  return apiClient.get<ImpactReportOut[]>(`/compliance/reports?${params}`);
}

export async function getReport(id: string): Promise<ImpactReportOut> {
  return apiClient.get<ImpactReportOut>(`/compliance/reports/${id}`);
}

export async function getReportHistory(): Promise<ImpactReportOut[]> {
  return apiClient.get<ImpactReportOut[]>("/compliance/reports/history");
}

export async function listCirculars(
  source?: string,
  limit = 20
): Promise<CircularOut[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (source) params.set("source", source);
  return apiClient.get<CircularOut[]>(`/compliance/circulars?${params}`);
}

export async function getStats(): Promise<StatsOut> {
  return apiClient.get<StatsOut>("/compliance/stats");
}
