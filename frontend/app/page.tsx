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

    // Authenticated but no company → go to onboarding step 1
    if (user && !company) {
      router.push("/onboarding/company");
      return;
    }

    // Fully onboarded → go to dashboard
    if (user && company) {
      router.push("/dashboard");
    }
  }, [user, company, loading, isHydrated, router]);

  // Show loading state while hydrating
  if (loading || !isHydrated) {
    return (
      <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex items-center justify-center">
        <div className="text-center font-mono text-sm text-[var(--color-neo-fg-muted)]">
          Initializing system...
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] text-[var(--color-neo-fg-primary)] overflow-hidden">
      <Navbar />

      <main className="relative mx-auto max-w-[1440px] px-6 py-10 md:px-10 md:py-14">
        <div className="pointer-events-none absolute -left-14 top-24 h-40 w-40 rotate-6 border-[6px] border-[#0A0A0A] bg-[var(--color-neo-accent-yellow)] shadow-[10px_10px_0px_#0A0A0A]" />
        <div className="pointer-events-none absolute right-2 top-36 hidden h-24 w-56 -rotate-6 border-[6px] border-[#0A0A0A] bg-[var(--color-neo-accent-blue)] shadow-[10px_10px_0px_#0A0A0A] md:block" />
        <div className="pointer-events-none absolute -right-10 bottom-12 h-36 w-36 rotate-12 border-[6px] border-[#0A0A0A] bg-[var(--color-neo-accent-lime)] shadow-[10px_10px_0px_#0A0A0A]" />

        <section className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <Card className="!p-8 md:!p-10 border-[4px] border-[#0A0A0A] shadow-[10px_10px_0px_#0A0A0A]">
            <p className="mb-4 inline-flex border-[3px] border-[#0A0A0A] bg-[var(--color-neo-accent-coral)] px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide text-white">
              Real-Time Regulatory Intelligence
            </p>

            <h1 className="font-display text-4xl font-black uppercase tracking-tighter leading-[0.95] md:text-6xl">
              Autonomous
              <br />
              Compliance
              <br />
              Engine
            </h1>

            <p className="mt-6 max-w-2xl font-mono text-sm text-[var(--color-neo-fg-muted)] md:text-base">
              Monitor RBI updates, map policy impact to your company context, and produce grounded compliance actions with a 6-agent pipeline.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Button variant="primary" size="xl" className="w-full sm:w-auto">
                  LOGIN TO SYSTEM
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary" size="xl" className="w-full sm:w-auto">
                  CREATE ACCOUNT
                </Button>
              </Link>
            </div>
          </Card>

          <div className="grid gap-5">
            <Card variant="accent-yellow" className="!p-6 border-[4px] border-[#0A0A0A] shadow-[8px_8px_0px_#0A0A0A]">
              <h2 className="font-heading text-2xl font-black uppercase leading-tight">Why This Works</h2>
              <ul className="mt-4 space-y-2 font-mono text-sm">
                <li>Live regulatory source monitoring</li>
                <li>Grounded RAG retrieval from Chroma</li>
                <li>Actionable team-specific impact reports</li>
              </ul>
            </Card>

            <Card className="!p-6 border-[4px] border-[#0A0A0A] shadow-[8px_8px_0px_#0A0A0A]">
              <h3 className="font-heading text-xl font-black uppercase">Pipeline Snapshot</h3>
              <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
                <span className="border-[2px] border-[#0A0A0A] bg-[var(--color-neo-surface-elevated)] px-2 py-2 text-center">Source Monitor</span>
                <span className="border-[2px] border-[#0A0A0A] bg-[var(--color-neo-surface-elevated)] px-2 py-2 text-center">Extractor</span>
                <span className="border-[2px] border-[#0A0A0A] bg-[var(--color-neo-surface-elevated)] px-2 py-2 text-center">Change Detector</span>
                <span className="border-[2px] border-[#0A0A0A] bg-[var(--color-neo-surface-elevated)] px-2 py-2 text-center">Impact Mapper</span>
                <span className="col-span-2 border-[2px] border-[#0A0A0A] bg-[var(--color-neo-accent-lime)] px-2 py-2 text-center font-bold">Report Generator + Validator</span>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
