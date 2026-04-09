export const mockDashboardData = {
  agents: [
    { id: "planner", name: "Planner", status: "completed", timestamp: "10:45 AM", reasoning: "Analyzed request. Determined optimal processing route." },
    { id: "scout", name: "Scout", status: "completed", timestamp: "10:46 AM", reasoning: "Gathered EU AI Act snippets matching company profile." },
    { id: "parser", name: "Parser", status: "completed", timestamp: "10:47 AM", reasoning: "Extracted strict data residency clauses from policies." },
    { id: "delta", name: "Delta Engine", status: "completed", timestamp: "10:48 AM", reasoning: "Found 3 disparities between current policies and Article 13." },
    { id: "mapper", name: "Mapper", status: "running", timestamp: "10:49 AM", reasoning: "Mapping risk items to internal components..." },
    { id: "validator", name: "Validator", status: "pending", timestamp: "Pending", reasoning: "Awaiting final mapping to validate compliance rules." }
  ],
  regulation: {
    title: "EU Artificial Intelligence Act (AI Act)",
    date: "Enforced: 2026-08-01",
    source: "European Commission",
    summary: "Harmonized rules on artificial intelligence covering data quality, transparency, human oversight, and robustness."
  },
  impacts: [
    {
      id: "imp-1",
      component: "Recommendation Engine v2",
      riskLevel: "high",
      description: "Algorithm lacks mandated explainability hooks.",
      regulationSnippet: "Article 13: High-risk AI systems shall be designed and developed in such a way to ensure that their operation is sufficiently transparent to enable users to interpret the system's output.",
      policySnippet: "Section 4.1: ML Model Outputs. Models are black boxes but are regularly tested for bias before deployment.",
      recommendedActions: [
        "Implement SHAP value logging for all automated decisions.",
        "Add an 'Explain this' button on the user-facing dashboard."
      ]
    },
    {
      id: "imp-2",
      component: "User Data Pipeline",
      riskLevel: "medium",
      description: "Retention period exceeds maximum allowable without explicit consent.",
      regulationSnippet: "Article 10(5): Training, validation and testing data sets shall be subject to appropriate data governance and management practices.",
      policySnippet: "Data Retention Policy: User behavior events are stored indefinitely to improve model accuracy.",
      recommendedActions: [
        "Cap raw event retention at 24 months.",
        "Implement automated data scrubbing job."
      ]
    }
  ]
};
