"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CompanyOut, DocumentOut } from "@/app/types/api";

interface CompanyContextType {
  company: CompanyOut | null;
  documents: DocumentOut[];
  setCompany: (c: CompanyOut | null) => void;
  addDocument: (doc: DocumentOut) => void;
  removeDocument: (docId: string) => void;
  setDocuments: (docs: DocumentOut[]) => void;
  hasUploaded: boolean;
  isHydrated: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<CompanyOut | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("compliance_company");
    if (stored) {
      try {
        setCompany(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse company from local storage", e);
      }
    }
    setIsHydrated(true);
  }, []);

  const [documents, setDocuments] = useState<DocumentOut[]>([]);

  // Persist company to localStorage when it changes
  const updateCompany = useCallback((c: CompanyOut | null) => {
    setCompany(c);
    if (c) {
      localStorage.setItem("compliance_company", JSON.stringify(c));
      localStorage.setItem("compliance_company_id", c.id);
    } else {
      localStorage.removeItem("compliance_company");
      localStorage.removeItem("compliance_company_id");
    }
  }, []);

  const addDocument = useCallback((doc: DocumentOut) => {
    setDocuments((prev) => [...prev, doc]);
  }, []);

  const removeDocument = useCallback((docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        company,
        documents,
        setCompany: updateCompany,
        addDocument,
        removeDocument,
        setDocuments,
        hasUploaded: documents.length > 0,
        isHydrated,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
