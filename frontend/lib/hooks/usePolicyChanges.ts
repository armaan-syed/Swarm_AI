"use client";

import { useCallback, useEffect, useState } from "react";
import * as complianceApi from "@/lib/api/compliance";

interface PolicyChange {
  source: string;
  title: string;
  url: string;
  published_date: string | null;
  doc_type: string | null;
}

interface PolicyChangesState {
  changes: PolicyChange[];
  isLoading: boolean;
  error: string | null;
  lastChecked: Date | null;
}

export function usePolicyChanges() {
  const [state, setState] = useState<PolicyChangesState>({
    changes: [],
    isLoading: false,
    error: null,
    lastChecked: null,
  });

  const checkForChanges = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await complianceApi.checkPolicyChanges();
      setState(prev => ({
        ...prev,
        changes: result.changes,
        isLoading: false,
        lastChecked: new Date(),
      }));

      // Show alert if there are new changes
      if (result.new_changes > 0) {
        const titles = result.changes.map(change => change.title).join(", ");
        alert(`🚨 New RBI Policy Changes Detected!\n\n${result.new_changes} new document(s) found:\n${titles}\n\nCheck the dashboard for details.`);
      }
    } catch (error) {
      console.error("Failed to check policy changes:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to check for changes",
      }));
    }
  }, []);

  // Auto-check every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkForChanges();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial check
    checkForChanges();

    return () => clearInterval(interval);
  }, [checkForChanges]);

  return {
    ...state,
    checkForChanges,
  };
}