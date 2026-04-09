"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CompanyOut, DocumentOut } from "@/app/types/api";

interface CompanyContextType {
  company: CompanyOut | null;
  documents: DocumentOut[];
  setCompany: (c: CompanyOut | null) => void;
  addDocument: (doc: DocumentOut) => void;
  removeDocument: (docId: string) => void;
  setDocuments: (docs: DocumentOut[]) => void;
  hasUploaded: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<CompanyOut | null>(() => {
    // Hydrate from localStorage
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("compliance_company");
    return stored ? JSON.parse(stored) : null;
  });

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
