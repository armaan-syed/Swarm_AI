"use client";

import React from "react";

const newsItems = [
  "RBI: MASTER DIRECTION - PSL TARGETS REVISED TO 40% [ANALYZED]",
  "SEBI: NEW DISCLOSURE NORMS FOR ASSET MANAGERS [GROUNDED]",
  "MCA: UPDATED FILING REQUIREMENTS FOR NBFCs [MAPPED]",
  "SWARM_AI: 12 NEW DOCUMENTS SYNTHESIZED IN 4.2 SECONDS",
  "RBI: DIGITAL LENDING GUIDELINES V2.1 [TRACEABLE]",
  "POLICY_CONFLICT: LIC_2023_LENDING VS RBI_NT09C [RESOLVED]",
  "SYSTEM_STATUS: ALL 6 AGENTS OPERATING AT PEAK CAPACITY",
  "SEBI: AMENDMENT TO PROHIBITION OF INSIDER TRADING [ANALYZED]",
];

export function LandingMarquee() {
  return (
    <div className="bg-[#0A0A0A] border-y-[4px] border-black py-4 overflow-hidden flex whitespace-nowrap sticky top-[64px] z-40 shadow-[0px_4px_10px_rgba(0,0,0,0.5)]">
      <div className="flex animate-marquee gap-12 items-center">
        {[...newsItems, ...newsItems].map((item, i) => (
          <div key={i} className="flex items-center gap-4 group cursor-default">
            <span className="w-3 h-3 bg-[#BFFF00] border border-white shadow-[0_0_8px_#BFFF00]"></span>
            <span className="font-mono text-sm font-black text-white uppercase tracking-[0.2em] group-hover:text-[#BFFF00] transition-colors">
              {item}
            </span>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
