"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCompany } from "@/lib/hooks/useCompany";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Navbar } from "@/components/Navbar";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { company, isHydrated } = useCompany();

  useEffect(() => {
    if (loading || !isHydrated) return;
    if (user && !company) { router.push("/onboarding/company"); return; }
    if (user && company) { router.push("/dashboard"); }
  }, [user, company, loading, isHydrated, router]);

  if (loading || !isHydrated) {
    return (
      <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex items-center justify-center">
        <div className="font-mono text-sm text-[var(--color-neo-fg-muted)]">Initializing system...</div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] text-[var(--color-neo-fg-primary)]">
      <Navbar />

      <main className="relative mx-auto max-w-[1440px] px-6 pt-12 pb-20 md:px-16 md:pt-16">

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute left-0 top-16 h-44 w-44 rotate-6 border-[6px] border-[#0A0A0A] bg-[var(--color-neo-accent-yellow)] shadow-[8px_8px_0px_#0A0A0A]" />
        <div className="pointer-events-none absolute right-8 top-24 hidden h-28 w-52 -rotate-3 border-[6px] border-[#0A0A0A] bg-[var(--color-neo-accent-blue)] shadow-[8px_8px_0px_#0A0A0A] md:block" />
        <div className="pointer-events-none absolute right-0 bottom-8 h-40 w-40 rotate-12 border-[6px] border-[#0A0A0A] bg-[var(--color-neo-accent-lime)] shadow-[8px_8px_0px_#0A0A0A]" />

        {/* ── Hero row ── */}
        <section className="relative grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8 lg:items-stretch">

          {/* LEFT: Hero card */}
          <Card className="!p-10 border-[4px] border-[#0A0A0A] shadow-[12px_12px_0px_#0A0A0A] flex flex-col justify-between min-h-[420px]">
            <div>
              <p className="mb-5 inline-flex border-[3px] border-[#0A0A0A] bg-[var(--color-neo-accent-coral)] px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-white">
                Real-Time Regulatory Intelligence
              </p>

              <h1 className="font-display font-black uppercase leading-[0.9] tracking-tighter text-5xl md:text-7xl">
                Swarm
                <br />
                <span className="text-[var(--color-neo-accent-yellow)] [-webkit-text-stroke:3px_#0A0A0A]">AI</span>
              </h1>

              <p className="mt-6 font-mono text-sm leading-relaxed text-[var(--color-neo-fg-muted)] md:text-base max-w-lg">
                6 autonomous agents monitor RBI, SEBI & MCA in real time — scraping circulars, extracting PDF clauses, detecting changes, mapping business impact, and generating grounded compliance reports. Zero manual effort.
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Button variant="primary" size="xl" className="w-full sm:w-auto">
                  LOGIN TO SYSTEM →
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary" size="xl" className="w-full sm:w-auto">
                  CREATE ACCOUNT →
                </Button>
              </Link>
            </div>
          </Card>

          {/* RIGHT: two stacked cards */}
          <div className="flex flex-col gap-6">

            {/* Why it works */}
            <Card variant="accent-yellow" className="!p-8 border-[4px] border-[#0A0A0A] shadow-[8px_8px_0px_#0A0A0A] flex-1">
              <h2 className="font-heading text-2xl font-black uppercase leading-tight">Why It Works</h2>
              <ul className="mt-5 space-y-3 font-mono text-sm">
                {[
                  "🔍  Live scraping of RBI, SEBI & MCA",
                  "📄  PyMuPDF clause extraction from PDFs",
                  "🔁  SHA-256 dedup + fuzzy change detection",
                  "🧠  Groq LLM impact analysis per department",
                  "✅  Validator agent grounds every report",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">{item}</li>
                ))}
              </ul>
            </Card>

            {/* Pipeline */}
            <Card className="!p-8 border-[4px] border-[#0A0A0A] shadow-[8px_8px_0px_#0A0A0A]">
              <h3 className="font-heading text-xl font-black uppercase mb-5">Agent Pipeline</h3>
              <div className="flex flex-col gap-2 font-mono text-xs">
                {[
                  { label: "01  Source Monitor", color: "bg-[var(--color-neo-surface-elevated)]" },
                  { label: "02  Document Extractor", color: "bg-[var(--color-neo-surface-elevated)]" },
                  { label: "03  Change Detector", color: "bg-[var(--color-neo-surface-elevated)]" },
                  { label: "04  Impact Mapper", color: "bg-[var(--color-neo-surface-elevated)]" },
                  { label: "05  Report Generator", color: "bg-[var(--color-neo-surface-elevated)]" },
                  { label: "06  Validator", color: "bg-[var(--color-neo-accent-lime)] font-bold" },
                ].map((step) => (
                  <div
                    key={step.label}
                    className={`border-[2px] border-[#0A0A0A] px-3 py-2 ${step.color}`}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </section>

        {/* ── Stats row ── */}
        <section className="relative mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { value: "3", label: "Sources Monitored" },
            { value: "6", label: "Autonomous Agents" },
            { value: "10h", label: "Scan Interval" },
            { value: "0", label: "Manual Steps" },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="!p-5 border-[4px] border-[#0A0A0A] shadow-[6px_6px_0px_#0A0A0A] text-center"
            >
              <div className="font-display text-4xl font-black">{stat.value}</div>
              <div className="mt-1 font-mono text-xs uppercase tracking-wide text-[var(--color-neo-fg-muted)]">
                {stat.label}
              </div>
            </Card>
          ))}
        </section>

      </main>
    </div>
  );
}
