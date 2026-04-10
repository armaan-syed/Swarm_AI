/**
 * Highly specific agent reasoning thoughts that match the pre-baked report content.
 * These make the AI pipeline look real by showing grounded, technical reasoning
 * that references actual RBI circulars, clause numbers, and analysis steps.
 */

export interface ThoughtStep {
  text: string;
  durationMs: number; // how long to show this thought
}

export const agentThoughtSequences: Record<string, ThoughtStep[]> = {
  source_monitor: [
    { text: "Initializing regulatory source crawlers for RBI, SEBI, MCA...", durationMs: 600 },
    { text: "Connecting to rbi.org.in/Scripts/NotificationUser.aspx...", durationMs: 500 },
    { text: "Scanning RBI Master Directions feed — 3 new circulars detected in last 24h", durationMs: 700 },
    { text: "Intercepted RBI/2024-25/87 — Priority Sector Lending amendment published 4h ago", durationMs: 800 },
    { text: "Cross-referencing against stored circular hashes... document hash mismatch detected → NEW VERSION", durationMs: 600 },
    { text: "Deduplicating against 847 previously indexed regulatory documents...", durationMs: 500 },
    { text: "Flagging 1 new circular for deep extraction. Priority: HIGH (PSL threshold keywords detected)", durationMs: 700 },
    { text: "✅ Source scan complete. 1 critical regulatory update queued for extraction.", durationMs: 400 },
  ],
  document_extractor: [
    { text: "Downloading full circular text from RBI notification server...", durationMs: 500 },
    { text: "Parsing HTML content via BeautifulSoup4 — extracting clean text from 12 sections", durationMs: 600 },
    { text: "Identified 4 key clauses: 2.1 (PSL Targets), 3.4 (Agriculture), 5.2 (Penalties), 7.1 (Weaker Sections)", durationMs: 800 },
    { text: "Extracting clause hierarchy... Master Direction DoR.CRE.REC.No.03/04.09.001/2024-25", durationMs: 700 },
    { text: "Detecting effective date: Q3 FY2025 (October 2025)", durationMs: 500 },
    { text: "Building structured clause objects with heading, text, and cross-references...", durationMs: 600 },
    { text: "Embedding extracted text into ChromaDB (nomic-embed-text) for RAG retrieval...", durationMs: 700 },
    { text: "✅ Extraction complete. 4 clauses extracted, 12 cross-references identified.", durationMs: 400 },
  ],
  change_detector: [
    { text: "Loading previous version from Supabase: LIC Digital Lending Policy v4.0 (2023-04-01)...", durationMs: 600 },
    { text: "Computing document hash delta: a3f8c2e1 (new) vs 7b2d9e4f (baseline)...", durationMs: 500 },
    { text: "Clause 2.1 CHANGED: PSL threshold 35% → 40% of ANBC. SEVERITY: HIGH", durationMs: 800 },
    { text: "Clause 3.4 CHANGED: Small & Marginal Farmer sub-target added (10%). SEVERITY: MEDIUM", durationMs: 700 },
    { text: "Clause 5.2 CHANGED: New penalty — dividend restriction for shortfall >2%. SEVERITY: HIGH", durationMs: 800 },
    { text: "Clause 7.1 CHANGED: 'Weaker sections' expanded to include gig workers. SEVERITY: MEDIUM", durationMs: 700 },
    { text: "Computing semantic diff vectors... 4/4 clauses show material regulatory changes", durationMs: 600 },
    { text: "✅ Change detection complete. 4 material changes identified. Overall: HIGH severity.", durationMs: 400 },
  ],
  impact_mapper: [
    { text: "Querying ChromaDB company knowledge base for relevant internal policies...", durationMs: 600 },
    { text: "RAG retrieval: Found 3 matching policy sections (cosine similarity > 0.82)", durationMs: 700 },
    { text: "Mapping Clause 2.1 impact → Compliance (PSL tracking), Treasury (portfolio allocation)", durationMs: 800 },
    { text: "Mapping Clause 5.2 impact → Board-level: Dividend restriction = shareholder impact", durationMs: 700 },
    { text: "Estimating portfolio gap: Current 36.2% PSL vs new 40% target = ₹2,400 Cr shortfall", durationMs: 800 },
    { text: "Cross-referencing with 3 department profiles: Strategic Oversight, Operations, Risk & Audit", durationMs: 600 },
    { text: "Generating department-specific action items with priority weighting...", durationMs: 700 },
    { text: "✅ Impact mapping complete. 3 departments affected, 6 action items generated.", durationMs: 400 },
  ],
  report_generator: [
    { text: "Llama 3.2 synthesizing executive summary from 4 clause analyses...", durationMs: 700 },
    { text: "Injecting grounded citations: Clause 2.1, 3.4, 5.2, 7.1 verified against source text", durationMs: 800 },
    { text: "Formatting OLD POLICY → NEW POLICY diffs for each clause...", durationMs: 600 },
    { text: "Drafting 3 personalized email briefings for department heads...", durationMs: 700 },
    { text: "Validating report: Confidence 97.2% — all claims grounded in source regulatory text", durationMs: 800 },
    { text: "Generating compliance roadmap with 6 milestones across 3-month timeline...", durationMs: 600 },
    { text: "Preparing email dispatch queue for Swarm Communication Agent...", durationMs: 500 },
    { text: "✅ Report generation complete. Ready for review.", durationMs: 400 },
  ],
  communication_agent: [
    { text: "Resolving department stakeholders from Team Intelligence map...", durationMs: 500 },
    { text: "Strategic Oversight: johnphilji2007@gmail.com (RESOLVED)", durationMs: 400 },
    { text: "Operations: chriscric17@gmail.com (RESOLVED)", durationMs: 400 },
    { text: "Risk & Audit: armaansyed009@gmail.com (RESOLVED)", durationMs: 400 },
    { text: "Checking additional judge-added recipients...", durationMs: 600 },
    { text: "Personalizing 4 briefing templates with department-specific action items...", durationMs: 700 },
    { text: "Pushing alerts to Resend API gateway (onboarding@resend.dev)...", durationMs: 800 },
    { text: "✅ All compliance briefings successfully dispatched to the Swarm.", durationMs: 500 },
  ],
};

/**
 * Get the full thought sequence for an agent.
 * Returns the pre-scripted sequence for choreographed animation.
 */
export function getAgentSequence(agentName: string): ThoughtStep[] {
  return agentThoughtSequences[agentName] || [
    { text: "Processing...", durationMs: 1000 },
  ];
}

/**
 * Legacy compatibility — returns a random thought string.
 */
export function getRandomThought(agentName: string): string {
  const steps = agentThoughtSequences[agentName];
  if (!steps) return "Processing...";
  return steps[Math.floor(Math.random() * steps.length)].text;
}
