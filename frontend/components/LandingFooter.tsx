"use client";

import React from "react";
import { Button } from "./Button";

export function LandingFooter() {
  return (
    <footer className="bg-black text-white py-20 px-8 border-t-[6px] border-black overflow-hidden relative">
      {/* Decorative background scanline */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-[#BFFF00] opacity-20 animate-scanline"></div>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-[#0066FF] border-2 border-white flex items-center justify-center font-black text-xs">S</div>
             <h2 className="font-heading font-black text-2xl uppercase tracking-tighter">Swarm AI</h2>
          </div>
          <p className="font-mono text-xs text-gray-400 leading-relaxed max-w-xs">
            The world's first autonomous compliance swarm. 
            Built for institutions that demand absolute precision and zero latency.
          </p>
          <div className="flex gap-4">
             {["Twitter", "GitHub", "LinkedIn"].map(s => (
               <a key={s} href="#" className="font-mono text-[10px] uppercase font-black hover:text-[#BFFF00] transition-colors underline decoration-2 underline-offset-4">{s}</a>
             ))}
          </div>
        </div>

        <div>
          <h3 className="font-heading font-black text-xs uppercase text-[#BFFF00] mb-6 tracking-widest">Capabilities</h3>
          <ul className="flex flex-col gap-3 font-mono text-xs">
            <li><a href="https://www.rbi.org.in/Scripts/NotificationUser.aspx" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#BFFF00]">RBI Source Scraper</a></li>
            <li><a href="https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes&search=&str_type=circulars" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#BFFF00]">SEBI Circular Ingestion</a></li>
            <li><a href="https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/circulars.html" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#BFFF00]">MCA Circular Mapping</a></li>
            <li><a href="/dashboard" className="hover:underline hover:text-[#BFFF00]">Impact Analysis Swarm</a></li>
          </ul>
        </div>

        <div>
          <h3 className="font-heading font-black text-xs uppercase text-[#BFFF00] mb-6 tracking-widest">Resources</h3>
          <ul className="flex flex-col gap-3 font-mono text-xs">
             <li><a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#BFFF00]">API Documentation</a></li>
             <li><a href="https://www.rbi.org.in/Scripts/PublicationReportDetails.aspx?ID=1182" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#BFFF00]">Regulatory Sandbox</a></li>
             <li><a href="#" className="hover:underline hover:text-[#BFFF00]">Trust & Security</a></li>
             <li><a href="#" className="hover:underline hover:text-[#BFFF00]">System Status v4.0</a></li>
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="font-heading font-black text-xs uppercase text-[#BFFF00] tracking-widest">Initialize Connection</h3>
          <div className="flex flex-col gap-3">
             <input 
               type="email" 
               placeholder="ENTER EMAIL FOR UPDATES" 
               className="bg-transparent border-2 border-white p-3 font-mono text-[10px] outline-none focus:border-[#BFFF00]"
             />
             <Button variant="primary" size="sm" className="w-full shadow-none border-2">SUBSCRIBE &rarr;</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="font-mono text-[10px] text-gray-500 uppercase">
          &copy; 2024 SWARM AI INTELLIGENCE. ALL RIGHTS RESERVED. 
        </p>
        <div className="flex gap-6 font-mono text-[10px] text-gray-500 uppercase">
           <a href="#" className="hover:text-white">Privacy Protocol</a>
           <a href="#" className="hover:text-white">Terms of Ops</a>
        </div>
      </div>

      <style jsx>{`
        @keyframes scanline {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
      `}</style>
    </footer>
  );
}
