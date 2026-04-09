"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import * as complianceApi from "@/lib/api/compliance";
import { CircularOut } from "@/app/types/api";

export default function RegulationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [circulars, setCirculars] = useState<CircularOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  if (!user) {
    router.push("/login");
    return null;
  }

  useEffect(() => {
    const fetchCirculars = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await complianceApi.listCirculars(selectedSource || undefined, 50);
        setCirculars(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch regulations";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchCirculars();
  }, [selectedSource]);

  const sources = ["RBI", "SEBI", "MCA"];

  const getRiskBadgeVariant = (severity: string | null) => {
    switch (severity) {
      case "HIGH":
        return "error";
      case "MEDIUM":
        return "warning";
      case "LOW":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-8 pt-12 flex flex-col">
        <div className="mb-10">
          <h1 className="font-display font-black text-5xl uppercase tracking-tighter mb-3">
            Regulatory Intelligence
          </h1>
          <p className="font-mono text-sm text-[var(--color-neo-fg-muted)]">
            Latest circulars and notifications from RBI, SEBI, and MCA.
          </p>
        </div>

        {/* Source Filter */}
        <div className="mb-8 flex gap-3 flex-wrap">
          <Button
            variant={selectedSource === null ? "primary" : "secondary"}
            size="md"
            onClick={() => setSelectedSource(null)}
          >
            All Sources
          </Button>
          {sources.map((source) => (
            <Button
              key={source}
              variant={selectedSource === source ? "primary" : "secondary"}
              size="md"
              onClick={() => setSelectedSource(source)}
            >
              {source}
            </Button>
          ))}
        </div>

        {error && (
          <div className="bg-[#FF4D4D] text-white border-[3px] border-[#0A0A0A] p-4 font-mono text-sm mb-8">
            {error}
          </div>
        )}

        {loading ? (
          <Card className="flex items-center justify-center p-12">
            <p className="font-mono text-sm text-[#888]">Loading regulations...</p>
          </Card>
        ) : circulars.length === 0 ? (
          <Card className="flex items-center justify-center p-12 bg-[#BFFF00]">
            <p className="font-mono text-sm">No regulations found for the selected source.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {circulars.map((circular) => (
              <Card key={circular.id} className="flex flex-col gap-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-heading font-black text-lg uppercase tracking-tight mb-1">
                      {circular.title}
                    </h3>
                    <p className="font-mono text-xs text-[#888]">
                      {circular.source} • {circular.published_date || "Unknown date"}
                    </p>
                  </div>
                  {circular.severity && (
                    <Badge variant={getRiskBadgeVariant(circular.severity)}>
                      {circular.severity}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default">{circular.source}</Badge>
                  {circular.effective_date && (
                    <Badge variant="default">Eff: {circular.effective_date}</Badge>
                  )}
                </div>

                <div className="border-t-[2px] border-[#0A0A0A] pt-4">
                  <a
                    href={circular.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[#0066FF] underline break-all"
                  >
                    {circular.url}
                  </a>
                </div>

                <Link href={`/regulations/${circular.id}`} className="w-full">
                  <Button variant="accent" className="w-full" size="sm">
                    VIEW DETAILS →
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
