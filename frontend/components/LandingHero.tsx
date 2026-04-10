"use client";

import React from "react";
import { Button } from "./Button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export function LandingHero() {
  const router = useRouter();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <section className="relative py-20 px-8 overflow-hidden border-b-[6px] border-black bg-[#FFFEF2]">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'var(--pattern-grid)', backgroundSize: 'var(--pattern-grid-size)' }}></div>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        <div className="flex flex-col gap-8">
          <div className="inline-flex items-center gap-2 bg-[#BFFF00] border-2 border-black px-3 py-1 self-start shadow-[3px_3px_0px_#000]">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
            <span className="font-mono text-[10px] font-black uppercase tracking-widest">Live Intelligence Swarm: Active</span>
          </div>

          <h1 className="font-display font-black text-6xl md:text-8xl uppercase leading-[0.9] tracking-tighter">
            The Swarm <br />
            <span className="text-[#0066FF]">Is Watching.</span>
          </h1>

          <p className="font-mono text-lg text-[#3D3D3D] max-w-xl leading-relaxed">
            Swarm AI is an autonomous regulatory intelligence system. 
            Six specialized AI agents scan RBI and SEBI updates in real-time, 
            mapping global compliance changes to your specific internal policies.
          </p>

          <div className="flex flex-wrap gap-4 mt-4">
            <Button variant="primary" size="xl" onClick={handleCTA} className="group">
              {user ? "ACCESS DASHBOARD" : "INITIALIZE SYSTEM"} 
              <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Button>
            <Button variant="outline" size="xl" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              EXPLORE CAPABILITIES
            </Button>
          </div>
          
          <div className="flex items-center gap-6 mt-4">
             <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-none border-2 border-black bg-white flex items-center justify-center font-black text-xs shadow-[2px_2px_0px_#000]">
                    A{i}
                  </div>
                ))}
             </div>
             <p className="font-mono text-[11px] font-bold uppercase text-[#888]">
               Multi-Agent Orchestration <br/> v4.0.2 Stable
             </p>
          </div>
        </div>

        <div className="relative">
          {/* Main Hero Visual */}
          <div className="relative z-10 border-[6px] border-black shadow-[16px_16px_0px_#0A0A0A] bg-white overflow-hidden group">
            <img 
              src="/swarm_ai_hero.png" 
              alt="Swarm AI Hero" 
              className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-500 cursor-crosshair transform group-hover:scale-105"
            />
            
            {/* Overlay Status */}
            <div className="absolute top-4 left-4 bg-black text-[#BFFF00] p-2 font-mono text-[10px] border-2 border-[#BFFF00] uppercase tracking-widest">
              Grounded Synthesis: 0.98 Conf
            </div>
            
            <div className="absolute bottom-4 right-4 bg-white border-4 border-black p-4 shadow-[8px_8px_0px_#000] hidden md:block animate-bounce">
              <p className="font-heading font-black text-2xl uppercase italic">No Policy Left Behind.</p>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#FF4D4D] border-[3px] border-black -z-10 animate-spin-slow"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#FFE500] border-[3px] border-black -z-10 rotate-12"></div>
        </div>
      </div>
    </section>
  );
}
