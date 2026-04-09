"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/hooks/useAuth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password);
      router.push("/onboarding/company");
    } catch {
      setError("Signup failed. Try another email or check your password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans relative overflow-hidden">
      <Navbar />

      {/* Decorative brutalist elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-[#BFFF00] border-[6px] border-[#0A0A0A] shadow-[16px_16px_0px_#0A0A0A] -rotate-6 opacity-50 z-0"></div>
      <div className="absolute bottom-20 right-20 w-80 h-32 bg-[#FFE500] border-[6px] border-[#0A0A0A] shadow-[16px_16px_0px_#0A0A0A] rotate-12 opacity-50 z-0"></div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          <Card className="flex flex-col gap-8 bg-white border-neo-heavy !p-10 shadow-neo-brutal group hover:-translate-y-2 hover:-translate-x-2 transition-transform duration-200">
            <div className="text-center">
              <h1 className="font-display font-black text-4xl uppercase tracking-tighter leading-none mb-2">
                Create <br /><span className="text-[var(--color-neo-accent-lime)]">Account</span>
              </h1>
              <p className="font-mono text-sm text-[var(--color-neo-fg-muted)]">
                Join the compliance intelligence network.
              </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-[#FF4D4D] text-white border-[3px] border-[#0A0A0A] p-3 font-mono text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Email Address"
                placeholder="user@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm Password"
                placeholder="••••••••"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                variant="primary"
                className="w-full text-lg py-4 mt-4"
                disabled={isLoading}
              >
                {isLoading ? "CREATING..." : "CREATE ACCOUNT →"}
              </Button>
            </form>

            <div className="border-t-[3px] border-[#0A0A0A] pt-4 text-center">
              <p className="font-mono text-xs text-[var(--color-neo-fg-muted)] mb-3">
                Already have an account?
              </p>
              <Link href="/login" className="w-full">
                <Button variant="secondary" className="w-full">
                  SIGN IN →
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
