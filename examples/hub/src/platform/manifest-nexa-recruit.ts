import type { ProductManifest } from './types';

// ── NexaRecruit ──────────────────────────────────────────────────
// AI-powered Applicant Tracking System + Resume Builder.
// Built on NexaForge platform — integrates GridStorm (candidate pipeline),
// PDF Toolkit (resume parsing/export), and NexaCare (healthcare hiring).

export const nexaRecruitManifest: ProductManifest = {
  id: 'nexa-recruit',
  name: 'NexaRecruit',
  tagline: 'AI-Powered ATS & Resume Builder',
  description:
    'Enterprise applicant tracking system with AI-powered candidate screening, ' +
    'drag-and-drop Kanban pipeline, smart resume builder with PDF export, ' +
    'interview scheduling, and multi-board job posting. No per-seat pricing.',
  version: '0.2.0',
  status: 'coming-soon',
  tier: 'enterprise',
  color: '#8b5cf6',
  accentColor: 'rgba(139, 92, 246, 0.1)',
  iconName: 'users',
  homePath: '/product/nexa-recruit',
  docsRoot: null,
  primaryDemoPath: null,
  stats: [
    { value: 'Q2 2026', label: 'Target GA' },
    { value: 'AI',      label: 'Screening' },
    { value: 'Kanban',  label: 'Pipeline' },
    { value: 'PDF',     label: 'Resume Export' },
  ],
  keyFeatures: [
    'Kanban pipeline — drag-and-drop stage management with SLA tracking',
    'AI resume screening — candidate scoring & gap analysis',
    'Resume builder — drag-and-drop with PDF export via PDF Toolkit',
    'Interview scheduling with calendar sync (Google / Outlook)',
    'Multi-board posting — LinkedIn, Indeed, custom career pages',
    'Offer letter templates with e-signature workflow',
  ],
  quickLinks: [],
  tags: ['Coming Soon', 'ATS', 'HR Tech', 'Recruiting', 'Resume Builder', 'AI Screening'],
  seo: {
    title: 'NexaRecruit — ATS & Resume Builder | NexaForge',
    description:
      'Enterprise applicant tracking system with AI-powered candidate screening, ' +
      'drag-and-drop resume builder, and interview scheduling. Built on NexaForge.',
    keywords: [
      'applicant tracking system',
      'ATS software',
      'resume builder',
      'hiring software',
      'HR software',
      'candidate tracking',
      'interview scheduling software',
      'AI recruiting',
      'NexaRecruit',
    ],
    ogImage: '/og-nexa-recruit.png',
    jsonLdType: 'SoftwareApplication',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
  },
};
