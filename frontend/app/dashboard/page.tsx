"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AgentCard } from "@/components/AgentCard";
import { ImpactPanel } from "@/components/ImpactPanel";
import { mockDashboardData } from "@/lib/mockData";

export default function DashboardPage() {
  const [agents, setAgents] = useState(mockDashboardData.agents);
  
  // Simulate active agent updates for the "dynamic" feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setAgents(prev => {
        const newAgents = [...prev];
        const mapperIndex = newAgents.findIndex(a => a.id === "mapper");
        if (mapperIndex !== -1 && newAgents[mapperIndex].status === "running") {
          newAgents[mapperIndex] = { ...newAgents[mapperIndex], status: "completed", timestamp: "10:51 AM", reasoning: "Mapping complete. 2 high-risk impacts found." };
          
          const validatorIndex = newAgents.findIndex(a => a.id === "validator");
          if (validatorIndex !== -1) {
            newAgents[validatorIndex] = { ...newAgents[validatorIndex], status: "running", timestamp: "10:51 AM", reasoning: "Validating edge cases..." };
          }
        }
        return newAgents;
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen bg-[var(--color-neo-bg-alt)] flex flex-col font-sans overflow-hidden">
      <Navbar />
      
      <main className="flex-1 flex overflow-hidden p-6 gap-6 w-full max-w-[1920px] mx-auto">
        
        {/* Left Side: Agent Reasoning Panel */}
        <section className="w-[45%] flex flex-col gap-4 border- neo h-full relative">
          <div className="bg-[var(--color-neo-bg-inverse)] text-[var(--color-neo-fg-inverse)] p-4 border-[3px] border-[#0A0A0A] shadow-[4px_4px_0px_#0A0A0A] sticky top-0 z-10 flex justify-between items-center">
            <h2 className="font-display font-black text-2xl uppercase tracking-tighter">
              Agent Swarm Reasoning
            </h2>
            <div className="flex border-2 border-white">
              <span className="bg-[#FFE500] text-[#0A0A0A] px-2 py-0.5 font-bold font-mono text-xs uppercase animate-pulse">Running</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-5 pb-10">
            <div className="w-[2px] bg-[#0A0A0A] absolute left-[28px] top-[80px] bottom-10 z-0 hidden lg:block border-dashed border-r-2" />
            {agents.map((agent) => (
              <div key={agent.id} className="relative z-10">
                <AgentCard agent={agent as any} />
              </div>
            ))}
          </div>
        </section>

        {/* Right Side: Impact Report Panel */}
        <section className="w-[55%] h-full flex flex-col pl-4 border-l-[6px] border-[#0A0A0A]">
          <ImpactPanel 
            regulation={mockDashboardData.regulation} 
            impacts={mockDashboardData.impacts as any} 
          />
        </section>

      </main>
    </div>
  );
}
