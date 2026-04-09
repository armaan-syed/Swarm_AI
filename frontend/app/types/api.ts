// ── Auth ───────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserOut;
}

export interface UserOut {
  id: string;
  email: string;
}

// ── Company ────────────────────────────────────────────────────────────────
export interface CompanyCreate {
  name: string;
  industry?: string;
  product_description?: string;
}

export interface CompanyUpdate {
  name?: string;
  industry?: string;
  product_description?: string;
}

export interface CompanyOut {
  id: string;
  name: string;
  industry: string | null;
  product_description: string | null;
  created_at: string;
  updated_at: string;
}

// ── Documents ──────────────────────────────────────────────────────────────
export interface DocumentOut {
  id: string;
  company_id: string;
  filename: string;
  doc_hash: string;
  ingested_at: string;
}

export interface IngestResult {
  success: boolean;
  filename: string;
  chunks: number;
  doc_hash: string;
}

// ── Compliance pipeline ────────────────────────────────────────────────────
export interface RunPipelineRequest {
  sources?: ("RBI" | "SEBI" | "MCA")[];
  max_docs?: number;
  company_id?: string;
}

export interface ValidationOut {
  is_valid: boolean;
  confidence: number;
  issues: string[];
}

export interface ReportOut {
  markdown: string;
  citations: string[];
  affected_teams: string[];
  action_items: string[];
  grounded: boolean;
  generated_at: string;
  overall_severity: string;
}

export interface PipelineResultOut {
  ref: Record<string, unknown>;
  summary: string;
  severity: string;
  report: ReportOut | null;
  validation: ValidationOut | null;
}

export interface PipelineRunOut {
  found: number;
  processed: number;
  errors: string[];
  reports: PipelineResultOut[];
}

export interface CircularOut {
  id: string;
  source: string;
  title: string;
  url: string;
  published_date: string | null;
  effective_date: string | null;
  severity: string | null;
  created_at: string;
}

export interface ImpactReportOut {
  id: string;
  circular_url: string;
  summary: string;
  severity: string;
  markdown: string;
  citations: string[];
  affected_teams: string[];
  action_items: string[];
  grounded: boolean;
  created_at: string;
}

export interface StatsOut {
  total_circulars: number;
  total_reports: number;
  high_severity: number;
}

// ── Generic ────────────────────────────────────────────────────────────────
export interface ApiError {
  status: number;
  message: string;
}
