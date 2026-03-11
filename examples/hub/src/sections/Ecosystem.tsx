import { Icon } from '../icons/Icon';

const ecosystemCards = [
  {
    icon: 'rocket',
    title: 'Plugin Marketplace',
    description:
      'Publish, discover, and install community plugins. Open protocol for third-party extensions.',
  },
  {
    icon: 'globe',
    title: 'Multi-Framework',
    description:
      'First-class adapters for React 18+, Vue 3, and Svelte 5. Headless core works anywhere.',
  },
  {
    icon: 'layers',
    title: 'Shared Architecture',
    description:
      'Same Store, EventBus, CommandBus, and CSS tokens across both grid and PDF products.',
  },
];

export function Ecosystem() {
  return (
    <div className="platform-section">
      <div className="section-header" style={{ marginBottom: 16 }}>
        <h2>Platform Ecosystem</h2>
      </div>
      <div className="platform-grid">
        {ecosystemCards.map((card) => (
          <div key={card.title} className="platform-card">
            <div className="platform-icon">
              <Icon name={card.icon} size={22} />
            </div>
            <h4>{card.title}</h4>
            <p>{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
