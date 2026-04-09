"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StepIndicator } from "@/components/StepIndicator";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useCompany } from "@/lib/hooks/useCompany";
import * as companyApi from "@/lib/api/company";

export default function OnboardingCompanyPage() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setCompany } = useCompany();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }

    setIsLoading(true);

    try {
      const created = await companyApi.createCompany({
        name,
        industry: industry || undefined,
        product_description: description || undefined,
      });
      setCompany(created);
      router.push("/onboarding/documents");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create company";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 max-w-4xl w-full mx-auto p-8 pt-12 flex flex-col">
        <StepIndicator currentStep={1} totalSteps={2} />

        <Card className="flex-1 flex flex-col pt-10 px-12 border-neo-heavy shadow-neo-brutal mb-10">
          <h2 className="font-display font-black text-3xl uppercase tracking-tight mb-2">
            Company Context
          </h2>
          <p className="font-mono text-sm text-[var(--color-neo-fg-muted)] mb-10">
            Agent initialization requires base company parameters to accurately
            cross-reference compliance rules.
          </p>

          <form className="flex flex-col gap-6 w-full max-w-xl" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-[#FF4D4D] text-white border-[3px] border-[#0A0A0A] p-3 font-mono text-sm">
                {error}
              </div>
            )}

            <Input
              label="Company Name"
              placeholder="e.g. Acme Corp AI"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Industry (Optional)"
              placeholder="e.g. Financial Services, Healthcare"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />

            <div className="flex flex-col gap-2">
              <label className="font-label font-bold uppercase tracking-wider text-sm">
                Product Description
              </label>
              <textarea
                className="bg-white border-neo border-[3px] rounded-none px-[14px] py-[10px] font-mono text-sm text-[#0A0A0A] outline-none shadow-[4px_4px_0px_#0A0A0A] focus:shadow-[6px_6px_0px_#0066FF] focus:border-[var(--color-neo-accent-blue)] transition-all placeholder:text-[#888] placeholder:italic min-h-[120px] resize-none"
                placeholder="Describe your primary products, data pipelines, and target regions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mt-auto pt-10 flex justify-end">
              <Button size="xl" disabled={isLoading}>
                {isLoading ? "CREATING..." : "NEXT STEP →"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
