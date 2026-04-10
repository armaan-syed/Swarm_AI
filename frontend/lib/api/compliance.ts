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

export async function checkPolicyChanges(): Promise<{
  new_changes: number;
  changes: Array<{
    source: string;
    title: string;
    url: string;
    published_date: string | null;
    doc_type: string | null;
  }>;
}> {
  return apiClient.post("/compliance/check-policy-changes");
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
