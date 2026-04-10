"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCompany } from "@/lib/hooks/useCompany";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { company, isHydrated } = useCompany();

  useEffect(() => {
    if (loading || !isHydrated) return;

    // Not authenticated → go to login
    if (!user) {
      router.push("/login");
      return;
    }

    // Authenticated but no company → go to onboarding step 1
    if (!company) {
      router.push("/onboarding/company");
      return;
    }

    // Fully onboarded → go to dashboard
    router.push("/dashboard");
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

  return null;
}
