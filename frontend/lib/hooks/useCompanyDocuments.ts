"use client";

import { useCallback, useEffect, useState } from "react";
import { DocumentOut } from "@/app/types/api";
import * as companyApi from "@/lib/api/company";

export function useCompanyDocuments(companyId: string | undefined) {
  const [documents, setDocuments] = useState<DocumentOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDocuments = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");

    try {
      const docs = await companyApi.listDocuments(companyId);
      setDocuments(docs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch documents";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const deleteDocument = useCallback(
    async (docId: string) => {
      if (!companyId) return;
      setError("");

      try {
        await companyApi.deleteDocument(companyId, docId);
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Delete failed";
        setError(msg);
      }
    },
    [companyId]
  );

  const uploadDocument = useCallback(
    async (file: File) => {
      if (!companyId) return;
      setError("");

      try {
        await companyApi.uploadDocument(companyId, file);
        await fetchDocuments(); // Refresh list
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        throw err;
      }
    },
    [companyId, fetchDocuments]
  );

  return {
    documents,
    loading,
    error,
    deleteDocument,
    uploadDocument,
    refresh: fetchDocuments,
  };
}
