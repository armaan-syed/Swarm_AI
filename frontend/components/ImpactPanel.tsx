import React, { useState } from "react";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Button } from "./Button";

interface Impact {
  id: string;
  component: string;
  riskLevel: "high" | "medium" | "low";
  description: string;
  regulationSnippet: string;
  policySnippet: string;
  recommendedActions: string[];
}

interface Regulation {
  title: string;
  date: string;
  source: string;
  summary: string;
}

interface ImpactPanelProps {
  regulation: Regulation;
  impacts: Impact[];
}

export function ImpactPanel({ regulation, impacts }: ImpactPanelProps) {
  const [selectedTrace, setSelectedTrace] = useState<Impact | null>(null);

  const riskBadgeVariant = (level: string) => {
    switch (level) {
      case "high": return "error";
      case "medium": return "warning";
      case "low": return "success";
      default: return "default";
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <Card variant="accent-yellow" className="!p-5">
        <h2 className="font-heading font-black text-2xl uppercase mb-1">{regulation.title}</h2>
        <div className="flex gap-3 font-mono text-xs font-bold mb-3">
          <span className="bg-[#0A0A0A] text-white px-2 py-0.5">{regulation.date}</span>
          <span className="bg-white border-2 border-[#0A0A0A] px-2 py-0.5">{regulation.source}</span>
        </div>
        <p className="font-sans font-medium text-sm border-l-4 border-[#0A0A0A] pl-3">
          {regulation.summary}
        </p>
      </Card>

      <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
        {impacts.map((impact) => (
          <Card key={impact.id} className="relative overflow-visible">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-heading font-black text-lg">{impact.component}</h3>
              <Badge variant={riskBadgeVariant(impact.riskLevel)}>{impact.riskLevel} RISK</Badge>
            </div>
            
            <p className="font-sans font-medium text-[0.9rem] mb-4">{impact.description}</p>
            
            <div className="bg-[var(--color-neo-bg-alt)] border-2 border-dashed border-[#0A0A0A] p-3 mb-4 cursor-pointer hover:bg-[#E8E4D4] transition-colors" onClick={() => setSelectedTrace(selectedTrace?.id === impact.id ? null : impact)}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-label font-bold uppercase text-xs tracking-wider">Traceability Map</span>
                <span className="font-mono text-[10px] bg-[#FFE500] border border-[#0A0A0A] px-1 font-bold">CLICK TO VIEW</span>
              </div>
              {selectedTrace?.id === impact.id && (
                <div className="mt-3 flex flex-col gap-3 font-mono text-xs">
                  <div>
                    <strong className="block mb-1 text-[var(--color-neo-accent-coral)]">REGULATION:</strong>
                    <div className="bg-white border-neo p-2 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_#0A0A0A] transition-all">{impact.regulationSnippet}</div>
                  </div>
                  <div>
                    <strong className="block mb-1 text-[var(--color-neo-accent-blue)]">COMPANY POLICY:</strong>
                    <div className="bg-white border-neo p-2 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_#0A0A0A] transition-all">{impact.policySnippet}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-2">
              <span className="font-label font-bold uppercase text-xs tracking-wider mb-2 block">Recommended Actions:</span>
              <ul className="list-disc list-inside font-mono text-xs flex flex-col gap-1 text-[var(--color-neo-fg-muted)]">
                {impact.recommendedActions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t-4 border-[#0A0A0A]">
        <Button variant="dark" className="w-full h-14 text-xl">
          VIEW FULL REPORT →
        </Button>
      </div>
    </div>
  );
}
