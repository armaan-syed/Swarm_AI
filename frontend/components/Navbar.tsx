"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derive a display name from email (e.g. engine@company.com -> engine)
  const displayName = user?.email ? user.email.split("@")[0] : "Guest";
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="h-[64px] bg-[var(--color-neo-bg-base)] border-b-[3px] border-[var(--color-neo-border-default)] px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-[var(--color-neo-accent-blue)] border-2 border-[#0A0A0A] shadow-[2px_2px_0px_#0A0A0A] flex items-center justify-center">
          <span className="font-heading font-black text-white text-xs">SA</span>
        </div>
        <div className="flex flex-col cursor-pointer" onClick={() => router.push("/")}>
          <h1 className="font-heading font-black uppercase text-xl hidden sm:block leading-none">
            Swarm AI
          </h1>
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#888] hidden sm:block">
            Autonomous Compliance Intelligence
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="font-mono text-sm tracking-tighter hidden md:flex items-center">
          <span className="bg-[#FFE500] border-2 border-[#0A0A0A] px-3 py-1 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0A0A0A] animate-pulse"></span>
            SYSTEM ACTIVE
          </span>
        </div>
        
        {/* Profile Dropdown */}
        {user && (
          <div className="relative ml-2" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 h-10 bg-[#FF90E8] border-[3px] border-[#0A0A0A] flex items-center justify-center hover:shadow-[4px_4px_0px_#0A0A0A] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none cursor-pointer"
            >
              <span className="font-heading font-black text-[#0A0A0A] text-lg leading-none">{initial}</span>
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white border-[3px] border-[#0A0A0A] shadow-[6px_6px_0px_#0A0A0A] flex flex-col z-50 py-2">
                <div className="px-4 py-3 border-b-[3px] border-[#0A0A0A] mb-2 bg-[#F5F5F5]">
                  <p className="font-mono text-xs text-[#888] uppercase tracking-wider mb-1 font-bold">Signed in as</p>
                  <p className="font-bold font-sans text-sm truncate text-[#0A0A0A]">{user.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="mx-2 px-4 py-2 text-left font-bold font-mono text-sm uppercase hover:bg-[#FF4D4D] hover:text-white transition-colors flex items-center gap-2 relative group overflow-hidden"
                >
                  <span className="relative z-10 transition-transform group-hover:translate-x-1">&rarr; LOGOUT</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
