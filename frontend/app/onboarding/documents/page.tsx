"use client";

import React, { useState } from "react";
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
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { company, addDocument } = useCompany();
  const router = useRouter();

  if (!company) {
    router.push("/onboarding/company");
    return null;
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ["pdf", "docx", "txt"].includes(ext || "");
    });

    if (files.length > validFiles.length) {
      setError(`${files.length - validFiles.length} file(s) skipped (only PDF, DOCX, TXT allowed)`);
    }

    const newStaged = validFiles.map((f) => ({
      file: f,
      id: `${f.name}-${Date.now()}-${Math.random()}`,
    }));

    setStagedFiles((prev) => [...prev, ...newStaged]);
  };

  const removeFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUploadAndProceed = async () => {
    if (stagedFiles.length === 0) {
      setError("Please upload at least one document.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      for (const staged of stagedFiles) {
        await companyApi.uploadDocument(company.id, staged.file);
        addDocument({
          id: `doc-${Date.now()}`,
          company_id: company.id,
          filename: staged.file.name,
          doc_hash: `hash-${Date.now()}`,
          ingested_at: new Date().toISOString(),
        });
      }
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const goBack = () => {
    router.push("/onboarding/company");
  };

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 max-w-4xl w-full mx-auto p-8 pt-12 flex flex-col">
        <StepIndicator currentStep={2} totalSteps={2} />

        <Card className="flex-1 flex flex-col pt-10 px-12 border-neo-heavy shadow-neo-brutal mb-10 bg-[#FFFEF2]">
          <h2 className="font-display font-black text-3xl uppercase tracking-tight mb-2">
            Knowledge Base Ingestion
          </h2>
          <p className="font-mono text-sm text-[var(--color-neo-fg-muted)] mb-10">
            Provide necessary documentation. The Parser Agent will begin indexing immediately.
          </p>

          {error && (
            <div className="bg-[#FF4D4D] text-white border-[3px] border-[#0A0A0A] p-3 font-mono text-sm mb-6">
              {error}
            </div>
          )}

          {/* Upload Area */}
          <div className="mb-10">
            <label
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center p-10 border-[4px] border-dashed border-[#0A0A0A] rounded-none bg-[var(--color-neo-bg-alt)] hover:bg-[var(--color-neo-surface-elevated)] cursor-pointer transition-colors"
            >
              <span className="text-4xl mb-3">📄</span>
              <span className="font-mono text-sm font-bold text-[#0A0A0A]">
                Drag files here or <span className="text-[var(--color-neo-accent-blue)] underline">Browse</span>
              </span>
              <span className="font-mono text-xs text-[#888] mt-2">(PDF, DOCX, TXT)</span>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>

          {/* Staged Files List */}
          {stagedFiles.length > 0 && (
            <div className="mb-10">
              <h3 className="font-label font-bold uppercase tracking-wider text-sm mb-4">
                Staged Files ({stagedFiles.length})
              </h3>
              <div className="flex flex-col gap-3">
                {stagedFiles.map((staged) => (
                  <div
                    key={staged.id}
                    className="flex items-center justify-between bg-white border-[3px] border-[#0A0A0A] p-4 shadow-[4px_4px_0px_#0A0A0A]"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg">📎</span>
                      <div className="flex-1">
                        <p className="font-mono text-sm font-bold truncate">
                          {staged.file.name}
                        </p>
                        <p className="font-mono text-xs text-[#888]">
                          {(staged.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(staged.id)}
                      className="ml-4 text-xl hover:scale-110 transition-transform"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-auto pt-10 flex justify-between items-center border-t-[3px] border-[#0A0A0A] border-dashed pt-8">
            <Button variant="ghost" onClick={goBack} disabled={uploading}>
              ← BACK
            </Button>
            <Button
              variant="accent"
              size="xl"
              onClick={handleUploadAndProceed}
              disabled={uploading || stagedFiles.length === 0}
            >
              {uploading ? "UPLOADING..." : "INITIALIZE AGENTS →"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
