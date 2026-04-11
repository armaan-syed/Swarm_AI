"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StepIndicator } from "@/components/StepIndicator";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { useCompany } from "@/lib/hooks/useCompany";
import * as companyApi from "@/lib/api/company";

interface StagedFile {
  file: File;
  id: string;
}

export default function OnboardingDocumentsPage() {
  const [slots, setSlots] = useState<(File | null)[]>([null, null, null]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { company, addDocument } = useCompany();
  const router = useRouter();

  useEffect(() => {
    if (!company) {
      router.push("/onboarding/company");
    }
  }, [company, router]);

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "docx", "txt"].includes(ext || "")) {
        setError("Only PDF, DOCX, and TXT files are supported.");
        return;
      }
      const newSlots = [...slots];
      newSlots[index] = file;
      setSlots(newSlots);
      setError("");
    }
  };

  const removeFile = (index: number) => {
    const newSlots = [...slots];
    newSlots[index] = null;
    setSlots(newSlots);
  };

  const handleUploadAndProceed = async () => {
    const filesToUpload = slots.filter((f): f is File => f !== null);
    
    if (filesToUpload.length === 0) {
      setError("Please upload at least one document to proceed.");
      return;
    }

    if (!company) {
      setError("Company session not found. Please restart onboarding.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Parallelize uploads for 'Ludicrous Speed' ingestion
      await Promise.all(
        filesToUpload.map(async (file) => {
          await companyApi.uploadDocument(company.id, file);
          addDocument({
            id: `doc-${Date.now()}-${Math.random()}`,
            company_id: company.id,
            filename: file.name,
            doc_hash: `indexing`,
            ingested_at: new Date().toISOString(),
          });
        })
      );
      
      // Navigate immediately
      router.push("/dashboard?status=indexing");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const hasAtLeastOneFile = slots.some((f) => f !== null);

  const slotLabels = ["Primary Policy Doc", "Contract Standards", "Operational Guidelines"];

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 max-w-5xl w-full mx-auto p-8 pt-12 flex flex-col">
        <StepIndicator currentStep={2} totalSteps={2} />

        <Card className="flex-1 flex flex-col pt-10 px-12 border-neo-heavy shadow-neo-brutal mb-10 bg-[#FFFEF2]">
          <h2 className="font-display font-black text-3xl uppercase tracking-tight mb-2">
            Knowledge Base Ingestion
          </h2>
          <p className="font-mono text-sm text-[var(--color-neo-fg-muted)] mb-10">
            Provide necessary documentation. The Parser Agent will begin indexing immediately.
          </p>

          {error && (
            <div className="bg-[#FF4D4D] text-white border-[3px] border-[#0A0A0A] p-3 font-mono text-sm mb-6 shadow-[4px_4px_0px_#0A0A0A]">
              {error}
            </div>
          )}

          {/* 3 Upload Slots */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {slots.map((file, index) => (
              <div key={index} className="flex flex-col gap-3">
                <p className="font-label font-bold uppercase tracking-wider text-xs text-[#555]">
                  Slot {index + 1}: {slotLabels[index]}
                </p>
                {file ? (
                  <div className="h-[180px] bg-white border-[3px] border-[#0A0A0A] p-5 shadow-[4px_4px_0px_#0A0A0A] flex flex-col justify-between items-center text-center">
                    <div className="text-3xl">📄</div>
                    <div className="w-full">
                      <p className="font-mono text-xs font-bold truncate mb-1">{file.name}</p>
                      <p className="font-mono text-[10px] text-[#888]">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button 
                      onClick={() => removeFile(index)}
                      className="text-[10px] font-bold font-mono uppercase bg-[#FF4D4D] text-white border-2 border-[#0A0A0A] px-2 py-0.5 shadow-[2px_2px_0px_#0A0A0A] active:translate-y-0.5 active:shadow-none transition-all"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="h-[180px] bg-[var(--color-neo-bg-alt)] border-[3px] border-dashed border-[#0A0A0A] p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--color-neo-surface-elevated)] transition-all group">
                    <span className="text-2xl mb-2 opacity-50 group-hover:opacity-100 transition-opacity">➕</span>
                    <span className="font-mono text-[11px] font-bold text-[#333] mb-1">Upload File</span>
                    <span className="font-mono text-[9px] text-[#888]">(PDF, DOCX, TXT)</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => handleFileChange(index, e)} 
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          <div className="bg-[#f0f0f0] border-l-4 border-black p-4 mb-10 italic">
            <p className="font-mono text-xs text-[#555]">
              &ldquo;One single file is enough to fuel the agent swarm, but the more context you provide, the higher the precision.&rdquo;
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto pt-10 flex justify-between items-center border-t-[3px] border-[#0A0A0A] border-dashed pt-8">
            <Button variant="ghost" onClick={() => router.push("/onboarding/company")} disabled={uploading}>
              ← BACK
            </Button>
            <Button
              variant="accent"
              size="xl"
              onClick={handleUploadAndProceed}
              disabled={uploading || !hasAtLeastOneFile}
            >
              {uploading ? "UPLOADING..." : "INITIALIZE AGENTS →"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
