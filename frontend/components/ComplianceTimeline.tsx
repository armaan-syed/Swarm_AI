import React from "react";
import { Card } from "./Card";
import { Badge } from "./Badge";

interface TimelineItem {
  title: string;
  date: string;
  status: "pending" | "completed" | "overdue";
  department: string;
  person: string;
}

interface ComplianceTimelineProps {
  items: TimelineItem[];
  effectiveDate?: string;
}

export function ComplianceTimeline({ items, effectiveDate }: ComplianceTimelineProps) {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center gap-4 mb-2">
        <h3 className="font-heading font-black text-xl uppercase tracking-tighter">
          Compliance Roadmap
        </h3>
        {effectiveDate && (
          <Badge variant="dark" className="bg-[#0066FF]">
            DEADLINE: {effectiveDate}
          </Badge>
        )}
      </div>

      <div className="relative pl-8 border-l-[3px] border-[#0A0A0A] ml-2 flex flex-col gap-8">
        {items.map((item, index) => (
          <div key={index} className="relative">
            {/* Dot */}
            <div className={`absolute -left-[43px] top-1 w-6 h-6 border-[3px] border-[#0A0A0A] shadow-[2px_2px_0px_#0A0A0A] ${
              item.status === 'completed' ? 'bg-[#BFFF00]' : 
              item.status === 'overdue' ? 'bg-[#FF4D4D]' : 'bg-white'
            }`}>
              {item.status === 'completed' && <span className="flex items-center justify-center h-full text-[10px] font-black">✓</span>}
            </div>

            <Card className="!p-4 hover:-translate-x-1 transition-transform cursor-default">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-[10px] font-black text-[#555] uppercase">
                  {item.date}
                </span>
                <Badge variant={item.status === 'overdue' ? 'danger' : 'default'} className="text-[10px] px-1 py-0">
                  {item.status.toUpperCase()}
                </Badge>
              </div>
              <h4 className="font-heading font-black text-sm uppercase leading-tight mb-2">
                {item.title}
              </h4>
              <div className="flex gap-2">
                <span className="font-heading font-black text-[9px] uppercase bg-black text-white px-1 py-0.5">
                  {item.department}
                </span>
                <span className="font-mono text-[9px] font-bold text-[#888]">
                  Owner: {item.person}
                </span>
              </div>
            </Card>
          </div>
        ))}

        {items.length === 0 && (
          <p className="font-mono text-xs text-[#888] italic">
            Waiting for AI to synthesize timeline...
          </p>
        )}
      </div>
    </div>
  );
}
