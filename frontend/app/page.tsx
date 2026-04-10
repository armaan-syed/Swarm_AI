"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useCompany } from "@/lib/hooks/useCompany";
import { Navbar } from "@/components/Navbar";
import { LandingHero } from "@/components/LandingHero";
import { LandingMarquee } from "@/components/LandingMarquee";
import { LandingFeatures } from "@/components/LandingFeatures";
import { LandingFooter } from "@/components/LandingFooter";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";

export default function RootPage() {
  const { loading } = useAuth();
  const { isHydrated } = useCompany();

  // Show loading state while hydrating
  if (loading || !isHydrated) {
    return (
      <div className="min-h-screen bg-[#FFFEF2] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-[4px] border-black border-t-[#FFE500] animate-spin mb-4 mx-auto"></div>
          <p className="font-mono text-xs font-black uppercase tracking-widest text-[#0A0A0A]">
            Booting Swarm AI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFEF2] text-[#0A0A0A] font-sans overflow-x-hidden selection:bg-[#FFE500] selection:text-black">
      <Navbar />
      <LandingMarquee />
      
      <main className="flex-1">
        <LandingHero />
        
        {/* Live System Counter Section */}
        <section className="bg-black py-12 border-b-[6px] border-black overflow-hidden flex justify-center">
          <div className="max-w-7xl w-full px-8 flex flex-col md:flex-row justify-around gap-12 text-center md:text-left">
            {[
              { label: "Circulars Ingested", value: "24,812" },
              { label: "Conflicts Detected", value: "1,409" },
              { label: "Active Nodes", value: "12" },
              { label: "Latency", value: "8ms" }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col gap-1 group">
                <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest font-black group-hover:text-[#FFE500] transition-colors">{stat.label}</span>
                <span className="font-display font-black text-white text-5xl tracking-tighter group-hover:scale-110 transition-transform cursor-default">{stat.value}</span>
              </div>
            ))}
          </div>
        </section>

        <LandingFeatures />

        {/* Intelligence Visualization Section */}
        <section className="py-24 px-8 bg-white border-b-[6px] border-black relative">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
               {/* Terminal Mockup */}
               <Card className="!p-0 bg-black border-4 border-black shadow-[12px_12px_0px_#BFFF00] overflow-hidden">
                  <div className="bg-[#1A1A1A] px-4 py-2 border-b-2 border-black flex justify-between items-center">
                    <div className="flex gap-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-[#FF4D4D]"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-[#FFE500]"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-[#BFFF00]"></div>
                    </div>
                    <span className="font-mono text-[10px] text-white font-bold opacity-50 uppercase">SWARM_LOG_STREAM // v4.0.0</span>
                  </div>
                  <pre className="p-6 font-mono text-[11px] text-[#BFFF00] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    <code>{`[SYSTEM] INIT: Swarm Intelligence Protocol v4.0.0
[AGENT_1] MONITOR: Scanning www.rbi.org.in/Scripts/NotificationUser.aspx...
[AGENT_1] FOUND: New Master Direction (RBI/2024-25/08)
[AGENT_2] EXTRACT: Document successfully parsed into 12 distinct clauses.
[AGENT_3] COMPARE: Semantic drift detected in Clause 4.2 vs LIC_POLICY_v4.
[AGENT_4] IMPACT: Treasury department impact set to HIGH.
[AGENT_5] REPORT: Synthesizing grounded executive summary...
[AGENT_6] VALIDATE: Hallucination check passed. Grounding confidence 0.98.
[SYSTEM] DONE: Report published to dashboard in 1.84s.`}</code>
                  </pre>
               </Card>
            </div>

            <div className="order-1 lg:order-2">
               <Badge variant="dark" className="mb-4">REAL-TIME TELEMETRY</Badge>
               <h2 className="font-display font-black text-5xl uppercase tracking-tighter mb-6 leading-none">
                 Watch the <span className="text-[#0066FF]">Swarm</span> <br /> Think in Real-Time.
               </h2>
               <p className="font-mono text-lg text-[#3D3D3D] mb-8 leading-relaxed">
                 Our agent orchestration doesn’t just show results; it shows the **reasoning**. 
                 Experience total transparency with live agent logs and traceable document citations.
               </p>
               <ul className="flex flex-col gap-4 font-mono text-sm font-bold">
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 bg-[#FFE500] border-2 border-black flex items-center justify-center text-[10px]">&rarr;</span>
                    Contrastive Analysis vs Historical Data
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 bg-[#FFE500] border-2 border-black flex items-center justify-center text-[10px]">&rarr;</span>
                    Semantic Drift Detection
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 bg-[#FFE500] border-2 border-black flex items-center justify-center text-[10px]">&rarr;</span>
                    Automated Action Item Generation
                  </li>
               </ul>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
