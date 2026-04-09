import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Navbar } from '@/components/Navbar';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--color-neo-bg-base)] flex flex-col font-sans relative overflow-hidden">
      <Navbar />
      
      {/* Decorative background brutalist elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-[#FFE500] border-[6px] border-[#0A0A0A] shadow-[16px_16px_0px_#0A0A0A] -rotate-6 opacity-50 z-0"></div>
      <div className="absolute bottom-20 right-20 w-80 h-32 bg-[#BFFF00] border-[6px] border-[#0A0A0A] shadow-[16px_16px_0px_#0A0A0A] rotate-12 opacity-50 z-0"></div>
      <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-[#FF4D4D] rounded-full border-[6px] border-[#0A0A0A] shadow-[8px_8px_0px_#0A0A0A] z-0"></div>

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

            <form className="flex flex-col gap-5">
              <Input label="Admin Email" placeholder="engine@company.com" type="email" />
              <Input label="Access Key" placeholder="••••••••" type="password" />
              
              <Link href="/onboarding" className="w-full mt-4">
                <Button variant="primary" className="w-full text-lg py-4">ENTER SYSTEM →</Button>
              </Link>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
