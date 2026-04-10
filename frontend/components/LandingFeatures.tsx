"use client";

import React from "react";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Shield, Zap, Search, MessageSquareCode } from "lucide-react";

const features = [
  {
    title: "Real-Time Swarm Analysis",
    description: "6 specialized AI agents scanning RBI, SEBI, and MCA endpoints 24/7. Never miss a circular again.",
    icon: Zap,
    color: "#FFE500",
    badge: "AGENTS ACTIVE"
  },
  {
    title: "Precision Policy Mapping",
    description: "Our agents automatically cross-reference new regulations against your internal policies (like LIC 2023) to detect conflicts.",
    icon: Shield,
    color: "#BFFF00",
    badge: "RAG ENABLED"
  },
  {
    title: "Executive Synthesis",
    description: "Get grounded, action-oriented reports with clear department impacts and itemized compliance check-lists.",
    icon: Search,
    color: "#0066FF",
    badge: "GROUNDED"
  },
  {
    title: "Interactive RAG Chat",
    description: "Explore your entire regulatory and internal policy knowledge base through a high-precision interactive assistant.",
    icon: MessageSquareCode,
    color: "#FF4D4D",
    badge: "GPT-4O / LLAMA 3.2"
  }
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-24 px-8 bg-[#F5F0E8] border-b-[6px] border-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="font-display font-black text-5xl md:text-6xl uppercase tracking-tighter mb-4 leading-none">
              Engineered for <br/>
              <span className="text-[#0A0A0A] bg-[#FFE500] px-3">Absolute Compliance.</span>
            </h2>
            <p className="font-mono text-lg text-[#3D3D3D]">
              Traditional compliance is reactive. <strong className="text-black bg-[#BFFF00] px-1">Swarm AI</strong> is proactive, autonomous, and brutally precise.
            </p>
          </div>
          <div className="bg-black text-white p-6 border-[3px] border-black shadow-[8px_8px_0px_#BFFF00]">
            <p className="font-mono text-sm leading-tight">
              // SYSTEM_CAPACITY: 1.2M CLAUSES/SEC <br/>
              // ANALYSIS_MODE: CONTRASTIVE <br/>
              // STATUS: NOMINAL
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <Card key={i} className="flex flex-col h-full bg-white group hover:shadow-[12px_12px_0px_#000] transition-all">
              <div 
                className="w-16 h-16 border-[3px] border-black mb-6 flex items-center justify-center shadow-[4px_4px_0px_#000] group-hover:scale-110 transition-transform"
                style={{ backgroundColor: feature.color }}
              >
                <feature.icon size={32} />
              </div>
              
              <Badge variant="dark" className="mb-4 self-start">{feature.badge}</Badge>
              
              <h3 className="font-heading font-black text-xl uppercase mb-3 leading-tight">
                {feature.title}
              </h3>
              
              <p className="font-mono text-sm text-[#3D3D3D] leading-relaxed">
                {feature.description}
              </p>
              
              <div className="mt-auto pt-8 flex items-center gap-2 font-black font-mono text-[10px] uppercase tracking-widest text-[#888]">
                <span>Deployment Tier: L1</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span>Encrypted</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
