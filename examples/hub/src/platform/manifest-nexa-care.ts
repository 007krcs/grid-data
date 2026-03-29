import type { ProductManifest } from './types';

// ── NexaCare ─────────────────────────────────────────────────────
// HIPAA-compliant healthcare data platform & clinical workflow automation.
// Powered by GridStorm (patient data grids), PDF Toolkit (document vault),
// and NexaForge platform services (auth, audit trail, encryption).

export const nexaCareManifest: ProductManifest = {
  id: 'nexa-care',
  name: 'NexaCare',
  tagline: 'HIPAA-Compliant Healthcare Data Platform',
  description:
    'End-to-end healthcare data platform with HL7/FHIR integration, ' +
    'clinical workflow automation, HIPAA-compliant document vault, ' +
    'patient scheduling, and real-time lab/vitals analytics via GridStorm.',
  version: '0.3.0',
  status: 'coming-soon',
  tier: 'enterprise',
  color: '#10b981',
  accentColor: 'rgba(16, 185, 129, 0.1)',
  iconName: 'heart-pulse',
  homePath: '/product/nexa-care',
  docsRoot: null,
  primaryDemoPath: null,
  stats: [
    { value: 'Q3 2026', label: 'Target GA' },
    { value: 'HIPAA',   label: 'Compliant' },
    { value: 'HL7/FHIR',label: 'Standard' },
    { value: 'AES-256', label: 'Encryption' },
  ],
  keyFeatures: [
    'HIPAA-compliant patient data management with full audit trail',
    'HL7/FHIR integration for EHR interoperability',
    'Clinical workflow automation with role-based access control',
    'Secure document vault — AES-256 encryption via PDF Toolkit',
    'Real-time lab results & vitals dashboard via GridStorm',
    'Patient scheduling with appointment reminders & conflict detection',
  ],
  quickLinks: [],
  tags: ['Coming Soon', 'Healthcare', 'HIPAA', 'HL7/FHIR', 'EHR Integration', 'Clinical Workflow'],
  seo: {
    title: 'NexaCare — Healthcare Data Platform | NexaForge',
    description:
      'HIPAA-compliant healthcare platform with HL7/FHIR integration, ' +
      'clinical workflow automation, and EHR interoperability. Powered by NexaForge.',
    keywords: [
      'healthcare software platform',
      'HIPAA compliant software',
      'EHR integration',
      'HL7 FHIR',
      'clinical workflow software',
      'healthcare data management',
      'patient management system',
      'HIPAA data grid',
      'NexaCare',
    ],
    ogImage: '/og-nexa-care.png',
    jsonLdType: 'SoftwareApplication',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'All',
  },
};
