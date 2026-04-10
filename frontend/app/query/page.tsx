"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import * as complianceApi from "@/lib/api/compliance";

interface QueryStep {
  agent: string;
  output: string;
}

interface QueryResult {
  success: boolean;
  answer: string;
  steps: QueryStep[];
  metadata: Record<string, unknown>;
}

export default function QueryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState("");

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!query.trim()) {
      setError("Please enter a query.");
      return;
    }

    setIsLoading(true);

    try {
      // Mock: simulate a generic agent query
      // Real implementation would call a `/query` endpoint when available
      // For now, demonstrate the flow with a simple regulation lookup
      const response = await complianceApi.listCirculars(undefined, 1);

      const mockResult: QueryResult = {
        success: true,
        answer: `Found ${response.length} regulatory circular(s) matching your query: "${query}". Use the Compliance Check on the Dashboard for full analysis.`,
        steps: [
          { agent: "planner", output: "Parsed query and identified intent" },
          { agent: "executor", output: "Searched regulatory database" },
          { agent: "validator", output: "Validated results quality" },
        ],
        metadata: { query_type: "regulatory_search", timestamp: new Date().toISOString() },
      };

      setResult(mockResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Query failed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-8 pt-12 flex flex-col">
        <div className="mb-10">
          <h1 className="font-display font-black text-5xl uppercase tracking-tighter mb-3">
            Compliance Query
          </h1>
          <p className="font-mono text-sm text-[var(--color-neo-fg-muted)]">
            Ask questions about regulatory compliance across RBI, SEBI, and MCA guidelines.
          </p>
        </div>

        <Card className="flex-1 flex flex-col pt-10 px-12 border-neo-heavy shadow-neo-brutal mb-10">
          <form className="flex flex-col gap-6 w-full" onSubmit={handleSubmit}>
            <div>
              <label className="font-label font-bold uppercase tracking-wider text-sm block mb-3">
                Your Question
              </label>
              <textarea
                className="w-full bg-white border-neo border-[3px] rounded-none px-[14px] py-[10px] font-mono text-sm text-[#0A0A0A] outline-none shadow-[4px_4px_0px_#0A0A0A] focus:shadow-[6px_6px_0px_#0066FF] focus:border-[var(--color-neo-accent-blue)] transition-all placeholder:text-[#888] placeholder:italic min-h-[120px] resize-none"
                placeholder="e.g., What are the KYC requirements under RBI guidelines? Or, What changes in SEBI regulations affect our company?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-[#FF4D4D] text-white border-[3px] border-[#0A0A0A] p-3 font-mono text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button size="xl" disabled={isLoading} variant="primary">
                {isLoading ? "QUERYING..." : "QUERY →"}
              </Button>
            </div>
          </form>

          {result && (
            <div className="mt-10 pt-10 border-t-[3px] border-[#0A0A0A] flex flex-col gap-6">
              <div>
                <h2 className="font-display font-black text-2xl uppercase tracking-tight mb-4">
                  Answer
                </h2>
                <Card className="!p-4">
                  <p className="font-mono text-sm leading-relaxed">{result.answer}</p>
                </Card>
              </div>

              {result.steps && result.steps.length > 0 && (
                <div>
                  <h3 className="font-display font-black text-lg uppercase tracking-tight mb-4">
                    Reasoning Steps
                  </h3>
                  <div className="flex flex-col gap-3">
                    {result.steps.map((step, i) => (
                      <Card key={i} className="!p-4">
                        <div className="flex gap-3">
                          <span className="font-bold text-[#FFE500]">{i + 1}</span>
                          <div className="flex-1">
                            <p className="font-label font-bold uppercase tracking-wider text-xs mb-1">
                              {step.agent}
                            </p>
                            <p className="font-mono text-sm">{step.output}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
