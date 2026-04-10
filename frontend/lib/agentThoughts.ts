export const agentThoughts: Record<string, string[]> = {
  source_monitor: [
    "Fetching RBI circulars...",
    "Scanning SEBI notifications...",
    "Checking MCA master directions...",
    "Deduplicating sources...",
  ],
  document_extractor: [
    "Parsing PDF content...",
    "Extracting clauses and sections...",
    "Detecting effective dates...",
    "Building clause hierarchy...",
  ],
  change_detector: [
    "Computing document hash...",
    "Detecting version changes...",
    "Comparing clause by clause...",
    "Flagging important terms...",
  ],
  impact_mapper: [
    "Mapping impacts to departments...",
    "Querying company documents...",
    "Estimating severity levels...",
    "Searching for similar cases...",
  ],
  report_generator: [
    "Generating executive summary...",
    "Creating action items...",
    "Validating citations...",
    "Formatting report...",
  ],
};

export function getRandomThought(agentName: string): string {
  const thoughts = agentThoughts[agentName] || ["Processing..."];
  return thoughts[Math.floor(Math.random() * thoughts.length)];
}
