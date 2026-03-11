const aiCards = [
  {
    badge: 'MCP',
    title: 'MCP Server',
    description:
      'Tool definitions for Claude and LLM integration. Automate document workflows with natural language.',
  },
  {
    badge: 'AI',
    title: 'Smart Form Fill',
    description:
      'LLM-powered intelligent form completion. Extract context from documents to auto-populate fields.',
  },
  {
    badge: 'AI',
    title: 'PII Detection',
    description:
      'AI-powered identification and redaction of sensitive data. GDPR, HIPAA, and SOC 2 compliant workflows.',
  },
  {
    badge: 'AI',
    title: 'Document Intelligence',
    description:
      'Automatic classification, entity extraction, and summarization. Turn unstructured PDFs into structured data.',
  },
];

export function AiSection() {
  return (
    <div className="ai-section">
      <div className="section-header" style={{ marginBottom: 16 }}>
        <h2>AI &amp; Document Intelligence</h2>
      </div>
      <div className="ai-grid">
        {aiCards.map((card) => (
          <div key={card.title} className="ai-card">
            <div className="ai-badge">{card.badge}</div>
            <h4>{card.title}</h4>
            <p>{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
