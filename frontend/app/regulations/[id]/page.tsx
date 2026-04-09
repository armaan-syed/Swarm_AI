"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import * as complianceApi from "@/lib/api/compliance";
import { ImpactReportOut } from "@/app/types/api";

export default function RegulationDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const reportId = params?.id as string;

  const [report, setReport] = useState<ImpactReportOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!user) {
    router.push("/login");
    return null;
  }

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) {
        setError("No report ID provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await complianceApi.getReport(reportId);
        setReport(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch report";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Card className="flex items-center justify-center p-12">
            <p className="font-mono text-sm text-[#888]">Loading report...</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-8 pt-12 flex flex-col gap-8">
        <Link href="/regulations" className="w-fit">
          <Button variant="ghost" size="md">
            ← BACK TO REGULATIONS
          </Button>
        </Link>

        {error && (
          <div className="bg-[#FF4D4D] text-white border-[3px] border-[#0A0A0A] p-4 font-mono text-sm">
            {error}
          </div>
        )}

        {report ? (
          <div className="flex flex-col gap-8">
            {/* Header */}
            <Card variant="accent-yellow" className="!p-6">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <h1 className="font-display font-black text-3xl uppercase tracking-tight mb-2">
                    {report.summary || "Impact Report"}
                  </h1>
                  <a
                    href={report.circular_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[#0066FF] underline break-all"
                  >
                    {report.circular_url}
                  </a>
                </div>
                <Badge variant={report.severity === "HIGH" ? "error" : report.severity === "MEDIUM" ? "warning" : "success"}>
                  {report.severity} SEVERITY
                </Badge>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Badge variant="dark">Report ID: {report.id.slice(0, 8)}...</Badge>
                {report.grounded && <Badge variant="success">✓ Grounded</Badge>}
              </div>
            </Card>

            {/* Report Content */}
            <Card className="!p-6">
              <h2 className="font-heading font-black text-xl uppercase tracking-tight mb-4">
                Full Report
              </h2>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#0A0A0A]">
                {report.markdown || "No report content available."}
              </div>
            </Card>

            {/* Affected Teams */}
            {report.affected_teams && report.affected_teams.length > 0 && (
              <Card className="!p-6">
                <h2 className="font-heading font-black text-lg uppercase tracking-tight mb-4">
                  Affected Teams
                </h2>
                <div className="flex flex-wrap gap-3">
                  {report.affected_teams.map((team, i) => (
                    <Badge key={i} variant="blue">
                      {team}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Action Items */}
            {report.action_items && report.action_items.length > 0 && (
              <Card className="!p-6">
                <h2 className="font-heading font-black text-lg uppercase tracking-tight mb-4">
                  Action Items
                </h2>
                <ul className="flex flex-col gap-3">
                  {report.action_items.map((item, i) => (
                    <li key={i} className="font-mono text-sm flex gap-3">
                      <span className="font-bold text-[#FFE500]">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Citations */}
            {report.citations && report.citations.length > 0 && (
              <Card className="!p-6">
                <h2 className="font-heading font-black text-lg uppercase tracking-tight mb-4">
                  Citations ({report.citations.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {report.citations.map((cite, i) => (
                    <Badge key={i} variant="default">
                      {cite}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Metadata */}
            <Card className="!p-4 bg-[#F5F0E8]">
              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <p className="text-[#888] mb-1">Created</p>
                  <p className="font-bold">{new Date(report.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[#888] mb-1">Grounded</p>
                  <p className="font-bold">{report.grounded ? "✓ Yes" : "✗ No"}</p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center p-12">
            <p className="font-mono text-sm text-[#888]">Report not found.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
