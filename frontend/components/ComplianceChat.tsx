"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, X, MessageSquare } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ComplianceChatProps {
  companyId?: string;
  context?: string;
}

export function ComplianceChat({ companyId, context }: ComplianceChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your Regulatory Assistant. I have access to your internal LIC policies and the latest RBI circulars. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const data = await apiClient.post<any>("/query", {
        query: userMsg,
        company_id: companyId,
        context: context,
      });

      if (data.success) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      } else {
        throw new Error(data.detail || "Failed to get answer");
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message || "Engine connection lost."}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[400px] h-[550px] bg-white border-[4px] border-[#0A0A0A] shadow-[12px_12px_0px_#0A0A0A] flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#0066FF] border-b-[4px] border-[#0A0A0A] p-4 flex justify-between items-center">
            <div>
              <h3 className="font-display font-black text-white uppercase tracking-tight text-lg leading-none">
                Compliance <br /><span className="text-black">Intelligence</span>
              </h3>
              <p className="font-mono text-[10px] text-white/80 mt-1 uppercase">Llama 3.2 · Local Engine</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="bg-white border-2 border-[#0A0A0A] p-1.5 hover:translate-y-0.5 hover:translate-x-0.5 active:shadow-none transition-all shadow-[2px_2px_0px_#0A0A0A]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[#FFFEF2]"
          >
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 shrink-0 border-2 border-[#0A0A0A] flex items-center justify-center shadow-[2px_2px_0px_#0A0A0A] ${msg.role === "user" ? "bg-[#BFFF00]" : "bg-[#0066FF]"}`}>
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} className="text-white" />}
                </div>
                <div className={`p-3 border-2 border-[#0A0A0A] shadow-[3px_3px_0px_#0A0A0A] font-mono text-xs leading-relaxed max-w-[80%] bg-white`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 shrink-0 border-2 border-[#0A0A0A] flex items-center justify-center bg-[#0066FF] shadow-[2px_2px_0px_#0A0A0A]">
                  <Bot size={16} className="text-white animate-pulse" />
                </div>
                <div className="p-3 border-2 border-[#0A0A0A] shadow-[2px_2px_0px_#0A0A0A] bg-white animate-pulse w-1/2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t-[4px] border-[#0A0A0A] p-4 bg-white">
            <div className="flex gap-3">
              <input 
                type="text"
                placeholder="Ask about PSL targets..."
                className="flex-1 border-2 border-[#0A0A0A] p-3 font-mono text-xs outline-none focus:border-[#0066FF] transition-all placeholder:text-[#888] italic"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="bg-[#BFFF00] border-2 border-[#0A0A0A] p-3 shadow-[3px_3px_0px_#0A0A0A] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-[#BFFF00] border-[4px] border-[#0A0A0A] shadow-[8px_8px_0px_#0A0A0A] flex items-center justify-center hover:-translate-y-1 hover:-translate-x-1 transition-transform group"
      >
        {isOpen ? <X size={32} /> : <MessageSquare size={32} />}
      </button>
    </div>
  );
}
