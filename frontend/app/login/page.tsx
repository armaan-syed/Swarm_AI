"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err?.message || "Login failed. Check your credentials.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans relative overflow-hidden">
      <Navbar />

      {/* Decorative brutalist elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-[#FFE500] border-[6px] border-[#0A0A0A] shadow-[16px_16px_0px_#0A0A0A] -rotate-6 opacity-50 z-0"></div>
      <div className="absolute bottom-20 right-20 w-80 h-32 bg-[#BFFF00] border-[6px] border-[#0A0A0A] shadow-[16px_16px_0px_#0A0A0A] rotate-12 opacity-50 z-0"></div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          <Card className="flex flex-col gap-8 bg-white border-neo-heavy !p-10 shadow-neo-brutal group hover:-translate-y-2 hover:-translate-x-2 transition-transform duration-200">
            <div className="text-center">
              <h1 className="font-display font-black text-4xl uppercase tracking-tighter leading-none mb-2">
                System <br /><span className="text-[var(--color-neo-accent-blue)]">Access</span>
              </h1>
              <p className="font-mono text-sm text-[var(--color-neo-fg-muted)]">
                Authenticate to access compliance engine.
              </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-[#FF4D4D] text-white border-[3px] border-[#0A0A0A] p-3 font-mono text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Admin Email"
                placeholder="engine@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Access Key"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                variant="primary"
                className="w-full text-lg py-4 mt-4"
                disabled={isLoading}
              >
                {isLoading ? "AUTHENTICATING..." : "ENTER SYSTEM →"}
              </Button>
            </form>

            <div className="border-t-[3px] border-[#0A0A0A] pt-4 text-center">
              <p className="font-mono text-xs text-[var(--color-neo-fg-muted)] mb-3">
                No account yet?
              </p>
              <Link href="/signup" className="w-full">
                <Button variant="secondary" className="w-full">
                  CREATE ACCOUNT →
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
