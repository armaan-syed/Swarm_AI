"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StepIndicator } from "@/components/StepIndicator";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { UploadBox } from "@/components/UploadBox";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans">
      <Navbar />
      
      <div className="flex-1 max-w-4xl w-full mx-auto p-8 pt-12 flex flex-col">
        <StepIndicator currentStep={step} totalSteps={2} />
        
        {step === 1 && (
          <Card className="flex-1 flex flex-col pt-10 px-12 border-neo-heavy shadow-neo-brutal mb-10">
            <h2 className="font-display font-black text-3xl uppercase tracking-tight mb-2">
              Company Context
            </h2>
            <p className="font-mono text-sm text-[var(--color-neo-fg-muted)] mb-10">
              Agent initialization requires base company parameters to accurately cross-reference compliance rules.
            </p>

            <div className="flex flex-col gap-6 w-full max-w-xl">
              <Input label="Company Name" placeholder="e.g. Acme Corp AI" />
              
              <div className="flex flex-col gap-2">
                <label className="font-label font-bold uppercase tracking-wider text-sm">Company Description</label>
                <textarea 
                  className="bg-white border-neo border-[3px] rounded-none px-[14px] py-[10px] font-mono text-sm text-[#0A0A0A] outline-none shadow-[4px_4px_0px_#0A0A0A] focus:shadow-[6px_6px_0px_#0066FF] focus:border-[var(--color-neo-accent-blue)] transition-all placeholder:text-[#888] placeholder:italic min-h-[120px] resize-none"
                  placeholder="Describe your primary products, data pipelines, and target regions..."
                />
              </div>
            </div>

            <div className="mt-auto pt-10 flex justify-end">
              <Button size="xl" onClick={() => setStep(2)}>
                NEXT STEP →
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="flex-1 flex flex-col pt-10 px-12 border-neo-heavy shadow-neo-brutal mb-10 bg-[#FFFEF2]">
            <h2 className="font-display font-black text-3xl uppercase tracking-tight mb-2">
              Knowledge Base Ingestion
            </h2>
            <p className="font-mono text-sm text-[var(--color-neo-fg-muted)] mb-10">
              Provide necessary documentation. The Parser Agent will begin indexing immediately.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <UploadBox label="Product Guidelines" icon="📦" />
              <UploadBox label="Legal Contracts" icon="⚖️" />
              <UploadBox label="Internal Policies" icon="🏢" />
            </div>

            <div className="mt-auto pt-10 flex justify-between items-center border-t-[3px] border-[#0A0A0A] border-dashed pt-8">
              <Button variant="ghost" onClick={() => setStep(1)}>
                ← BACK
              </Button>
              <Link href="/dashboard">
                <Button variant="accent" size="xl">
                  INITIALIZE AGENTS →
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
