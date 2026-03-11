import { describe, it, expect } from 'vitest';
import { detectPatterns } from '../detectors/patterns';
import { detectNames } from '../detectors/names';
import { detectAddresses } from '../detectors/addresses';
import {
  deduplicateMatches,
  filterByThreshold,
  computeOverallRisk,
} from '../confidence';
import { createPiiPlugin } from '../pii-plugin';
import type { PiiMatch } from '../types';

// ---------------------------------------------------------------------------
// Email Detection
// ---------------------------------------------------------------------------
describe('detectPatterns — email', () => {
  it('detects standard email addresses', () => {
    const text = 'Contact us at support@example.com for help.';
    const matches = detectPatterns(text, 0);
    const emails = matches.filter((m) => m.type === 'email');
    expect(emails).toHaveLength(1);
    expect(emails[0]!.value).toBe('support@example.com');
    expect(emails[0]!.confidence).toBe(0.95);
  });

  it('detects emails with plus addressing and subdomains', () => {
    const text = 'Send to john.doe+newsletter@mail.company.co.uk please';
    const matches = detectPatterns(text, 0);
    const emails = matches.filter((m) => m.type === 'email');
    expect(emails).toHaveLength(1);
    expect(emails[0]!.value).toBe('john.doe+newsletter@mail.company.co.uk');
  });

  it('detects multiple emails in text', () => {
    const text = 'From alice@test.org to bob@example.com cc carol@domain.net';
    const matches = detectPatterns(text, 0);
    const emails = matches.filter((m) => m.type === 'email');
    expect(emails).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Phone Number Detection
// ---------------------------------------------------------------------------
describe('detectPatterns — phone', () => {
  it('detects US phone numbers with parentheses', () => {
    const text = 'Call (555) 123-4567 for info.';
    const matches = detectPatterns(text, 0);
    const phones = matches.filter((m) => m.type === 'phone');
    expect(phones).toHaveLength(1);
    expect(phones[0]!.value).toContain('555');
  });

  it('detects phone numbers with dashes', () => {
    const text = 'Phone: 555-123-4567';
    const matches = detectPatterns(text, 0);
    const phones = matches.filter((m) => m.type === 'phone');
    expect(phones).toHaveLength(1);
    expect(phones[0]!.confidence).toBe(0.85);
  });

  it('detects phone numbers with +1 country code', () => {
    const text = 'Reach us at +1 800-555-0199';
    const matches = detectPatterns(text, 0);
    const phones = matches.filter((m) => m.type === 'phone');
    expect(phones).toHaveLength(1);
    expect(phones[0]!.value).toContain('+1');
  });
});

// ---------------------------------------------------------------------------
// SSN Detection
// ---------------------------------------------------------------------------
describe('detectPatterns — ssn', () => {
  it('detects valid SSNs with dashes', () => {
    const text = 'SSN: 123-45-6789';
    const matches = detectPatterns(text, 0);
    const ssns = matches.filter((m) => m.type === 'ssn');
    expect(ssns).toHaveLength(1);
    expect(ssns[0]!.value).toBe('123-45-6789');
    expect(ssns[0]!.confidence).toBe(0.9);
  });

  it('rejects SSNs starting with 000', () => {
    const text = 'Invalid: 000-12-3456';
    const matches = detectPatterns(text, 0);
    const ssns = matches.filter((m) => m.type === 'ssn');
    expect(ssns).toHaveLength(0);
  });

  it('rejects SSNs with 00 in middle group', () => {
    const text = 'Invalid: 123-00-6789';
    const matches = detectPatterns(text, 0);
    const ssns = matches.filter((m) => m.type === 'ssn');
    expect(ssns).toHaveLength(0);
  });

  it('detects SSNs without dashes', () => {
    const text = 'SSN 123456789 found';
    const matches = detectPatterns(text, 0);
    const ssns = matches.filter((m) => m.type === 'ssn');
    expect(ssns).toHaveLength(1);
    expect(ssns[0]!.value).toBe('123456789');
  });
});

// ---------------------------------------------------------------------------
// Credit Card Detection
// ---------------------------------------------------------------------------
describe('detectPatterns — credit card', () => {
  it('detects Visa card numbers', () => {
    const text = 'Card: 4111 1111 1111 1111';
    const matches = detectPatterns(text, 0);
    const cards = matches.filter((m) => m.type === 'credit-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]!.confidence).toBe(0.9);
  });

  it('detects MasterCard numbers with dashes', () => {
    const text = 'MC: 5500-0000-0000-0004';
    const matches = detectPatterns(text, 0);
    const cards = matches.filter((m) => m.type === 'credit-card');
    expect(cards).toHaveLength(1);
  });

  it('detects Discover card numbers', () => {
    const text = 'Discover: 6011 0000 0000 0004';
    const matches = detectPatterns(text, 0);
    const cards = matches.filter((m) => m.type === 'credit-card');
    expect(cards).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// IP Address Detection
// ---------------------------------------------------------------------------
describe('detectPatterns — ip-address', () => {
  it('detects valid IPv4 addresses', () => {
    const text = 'Server IP: 192.168.1.100';
    const matches = detectPatterns(text, 0);
    const ips = matches.filter((m) => m.type === 'ip-address');
    expect(ips).toHaveLength(1);
    expect(ips[0]!.value).toBe('192.168.1.100');
    expect(ips[0]!.confidence).toBe(0.9);
  });

  it('detects multiple IP addresses', () => {
    const text = 'From 10.0.0.1 to 172.16.254.1 via 255.255.255.0';
    const matches = detectPatterns(text, 0);
    const ips = matches.filter((m) => m.type === 'ip-address');
    expect(ips).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Date of Birth Detection
// ---------------------------------------------------------------------------
describe('detectPatterns — date-of-birth', () => {
  it('detects dates in MM/DD/YYYY format', () => {
    const text = 'DOB: 03/15/1990';
    const matches = detectPatterns(text, 0);
    const dobs = matches.filter((m) => m.type === 'date-of-birth');
    expect(dobs).toHaveLength(1);
    expect(dobs[0]!.value).toBe('03/15/1990');
  });

  it('detects dates in MM-DD-YYYY format', () => {
    const text = 'Date of Birth: 12-25-2001';
    const matches = detectPatterns(text, 0);
    const dobs = matches.filter((m) => m.type === 'date-of-birth');
    expect(dobs).toHaveLength(1);
    expect(dobs[0]!.value).toBe('12-25-2001');
  });
});

// ---------------------------------------------------------------------------
// Passport Detection
// ---------------------------------------------------------------------------
describe('detectPatterns — passport', () => {
  it('detects US passport format', () => {
    const text = 'Passport: A12345678';
    const matches = detectPatterns(text, 0);
    const passports = matches.filter((m) => m.type === 'passport');
    expect(passports).toHaveLength(1);
    expect(passports[0]!.value).toBe('A12345678');
    expect(passports[0]!.confidence).toBe(0.6);
  });
});

// ---------------------------------------------------------------------------
// Enabled Types Filtering
// ---------------------------------------------------------------------------
describe('detectPatterns — enabledTypes filter', () => {
  it('only detects specified types', () => {
    const text =
      'Email: test@test.com Phone: 555-123-4567 SSN: 123-45-6789';
    const matches = detectPatterns(text, 0, ['email']);
    expect(matches.every((m) => m.type === 'email')).toBe(true);
    expect(matches).toHaveLength(1);
  });

  it('returns nothing for empty enabledTypes array', () => {
    const text = 'Email: test@test.com Phone: 555-123-4567';
    const matches = detectPatterns(text, 0, []);
    expect(matches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Name Detection
// ---------------------------------------------------------------------------
describe('detectNames', () => {
  it('detects names after honorifics', () => {
    const text = 'Dear Mr. John Smith, your application has been reviewed.';
    const matches = detectNames(text, 0);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.type).toBe('name');
    expect(matches[0]!.value).toContain('John Smith');
    expect(matches[0]!.confidence).toBe(0.8);
  });

  it('detects names after Dr. title', () => {
    const text = 'Attending physician: Dr. Sarah Johnson';
    const matches = detectNames(text, 0);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.value).toContain('Sarah Johnson');
  });

  it('detects labeled names (Patient:)', () => {
    const text = 'Patient: Jane Williams\nDiagnosis: routine checkup';
    const matches = detectNames(text, 0);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const patientMatch = matches.find((m) => m.value.includes('Jane'));
    expect(patientMatch).toBeDefined();
    expect(patientMatch!.confidence).toBe(0.75);
  });

  it('detects labeled names (Employee:)', () => {
    const text = 'Employee: Robert Davis';
    const matches = detectNames(text, 0);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.value).toContain('Robert');
  });
});

// ---------------------------------------------------------------------------
// Address Detection
// ---------------------------------------------------------------------------
describe('detectAddresses', () => {
  it('detects US street addresses', () => {
    const text = 'Residence: 123 Main Street, Springfield';
    const matches = detectAddresses(text, 0);
    const streets = matches.filter((m) => m.confidence === 0.8);
    expect(streets).toHaveLength(1);
    expect(streets[0]!.value).toContain('123 Main Street');
  });

  it('detects state + ZIP combinations', () => {
    const text = 'Location: Springfield, IL 62704';
    const matches = detectAddresses(text, 0);
    const stateZip = matches.filter((m) => m.value.includes('62704'));
    expect(stateZip).toHaveLength(1);
    expect(stateZip[0]!.type).toBe('address');
  });

  it('detects addresses with various street suffixes', () => {
    const text = 'Office at 456 Oak Avenue and warehouse at 789 Pine Blvd';
    const matches = detectAddresses(text, 0);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------
describe('deduplicateMatches', () => {
  it('removes overlapping matches keeping higher confidence', () => {
    const matches: PiiMatch[] = [
      {
        type: 'phone',
        value: '555-123-4567',
        pageIndex: 0,
        startIndex: 10,
        endIndex: 22,
        confidence: 0.85,
      },
      {
        type: 'ssn',
        value: '555-12-3456',
        pageIndex: 0,
        startIndex: 10,
        endIndex: 21,
        confidence: 0.9,
      },
    ];
    const result = deduplicateMatches(matches);
    // SSN has higher confidence and same start, so it should be kept
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('ssn');
  });

  it('keeps non-overlapping matches on the same page', () => {
    const matches: PiiMatch[] = [
      {
        type: 'email',
        value: 'a@b.com',
        pageIndex: 0,
        startIndex: 0,
        endIndex: 7,
        confidence: 0.95,
      },
      {
        type: 'phone',
        value: '555-1234',
        pageIndex: 0,
        startIndex: 20,
        endIndex: 28,
        confidence: 0.85,
      },
    ];
    const result = deduplicateMatches(matches);
    expect(result).toHaveLength(2);
  });

  it('keeps matches on different pages regardless of overlap in index', () => {
    const matches: PiiMatch[] = [
      {
        type: 'email',
        value: 'a@b.com',
        pageIndex: 0,
        startIndex: 5,
        endIndex: 12,
        confidence: 0.95,
      },
      {
        type: 'email',
        value: 'c@d.com',
        pageIndex: 1,
        startIndex: 5,
        endIndex: 12,
        confidence: 0.95,
      },
    ];
    const result = deduplicateMatches(matches);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Confidence Threshold
// ---------------------------------------------------------------------------
describe('filterByThreshold', () => {
  it('filters out matches below threshold', () => {
    const matches: PiiMatch[] = [
      {
        type: 'email',
        value: 'a@b.com',
        pageIndex: 0,
        startIndex: 0,
        endIndex: 7,
        confidence: 0.95,
      },
      {
        type: 'passport',
        value: 'A12345678',
        pageIndex: 0,
        startIndex: 20,
        endIndex: 29,
        confidence: 0.6,
      },
      {
        type: 'date-of-birth',
        value: '01/15/1990',
        pageIndex: 0,
        startIndex: 40,
        endIndex: 50,
        confidence: 0.7,
      },
    ];
    const result = filterByThreshold(matches, 0.7);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.confidence >= 0.7)).toBe(true);
  });

  it('returns all matches when threshold is 0', () => {
    const matches: PiiMatch[] = [
      {
        type: 'passport',
        value: 'B99999999',
        pageIndex: 0,
        startIndex: 0,
        endIndex: 9,
        confidence: 0.6,
      },
    ];
    const result = filterByThreshold(matches, 0);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Risk Level Computation
// ---------------------------------------------------------------------------
describe('computeOverallRisk', () => {
  it('returns "low" for no matches', () => {
    expect(computeOverallRisk([])).toBe('low');
  });

  it('returns "critical" when SSN is present', () => {
    const matches: PiiMatch[] = [
      {
        type: 'ssn',
        value: '123-45-6789',
        pageIndex: 0,
        startIndex: 0,
        endIndex: 11,
        confidence: 0.9,
      },
    ];
    expect(computeOverallRisk(matches)).toBe('critical');
  });

  it('returns "critical" when credit card is present', () => {
    const matches: PiiMatch[] = [
      {
        type: 'credit-card',
        value: '4111111111111111',
        pageIndex: 0,
        startIndex: 0,
        endIndex: 16,
        confidence: 0.9,
      },
    ];
    expect(computeOverallRisk(matches)).toBe('critical');
  });

  it('returns "critical" when passport is present', () => {
    const matches: PiiMatch[] = [
      {
        type: 'passport',
        value: 'A12345678',
        pageIndex: 0,
        startIndex: 0,
        endIndex: 9,
        confidence: 0.6,
      },
    ];
    expect(computeOverallRisk(matches)).toBe('critical');
  });

  it('returns "high" for more than 10 non-critical matches', () => {
    const matches: PiiMatch[] = Array.from({ length: 11 }, (_, i) => ({
      type: 'email' as const,
      value: `user${i}@test.com`,
      pageIndex: 0,
      startIndex: i * 20,
      endIndex: i * 20 + 15,
      confidence: 0.95,
    }));
    expect(computeOverallRisk(matches)).toBe('high');
  });

  it('returns "medium" for 4 to 10 non-critical matches', () => {
    const matches: PiiMatch[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'email' as const,
      value: `user${i}@test.com`,
      pageIndex: 0,
      startIndex: i * 20,
      endIndex: i * 20 + 15,
      confidence: 0.95,
    }));
    expect(computeOverallRisk(matches)).toBe('medium');
  });

  it('returns "low" for 1 to 3 non-critical matches', () => {
    const matches: PiiMatch[] = [
      {
        type: 'email',
        value: 'a@b.com',
        pageIndex: 0,
        startIndex: 0,
        endIndex: 7,
        confidence: 0.95,
      },
      {
        type: 'phone',
        value: '555-1234',
        pageIndex: 0,
        startIndex: 20,
        endIndex: 28,
        confidence: 0.85,
      },
    ];
    expect(computeOverallRisk(matches)).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// Plugin Factory
// ---------------------------------------------------------------------------
describe('createPiiPlugin', () => {
  it('creates a valid PdfPlugin with correct metadata', () => {
    const plugin = createPiiPlugin();
    expect(plugin.id).toBe('pii');
    expect(plugin.name).toBe('PII Detection & Redaction');
    expect(plugin.version).toBe('0.1.0');
    expect(plugin.dependencies).toEqual(['text']);
    expect(typeof plugin.install).toBe('function');
  });

  it('accepts custom config', () => {
    const plugin = createPiiPlugin({
      enabledTypes: ['email', 'ssn'],
      confidenceThreshold: 0.5,
      autoScan: true,
    });
    expect(plugin.id).toBe('pii');
  });

  it('install registers state and commands', () => {
    const plugin = createPiiPlugin();
    const registeredStates: Record<string, unknown> = {};
    const registeredCommands: string[] = [];
    const context = {
      api: {},
      store: {
        getState: () => ({ pages: [] }),
        setState: () => {},
      },
      eventBus: {
        on: () => () => {},
        emit: () => {},
      },
      commandBus: {
        registerHandler: (cmd: string, _handler: unknown) => {
          registeredCommands.push(cmd);
          return () => {};
        },
        dispatch: () => {},
      },
      config: {},
      registerState: (key: string, initial: unknown) => {
        registeredStates[key] = initial;
      },
      getState: <S>(key: string): S => registeredStates[key] as S,
      setState: () => {},
    };

    const disposer = plugin.install(context);

    // State should be registered
    expect(registeredStates['pii']).toBeDefined();

    // Commands should be registered
    expect(registeredCommands).toContain('pii:scan');
    expect(registeredCommands).toContain('pii:scanAll');
    expect(registeredCommands).toContain('pii:autoRedact');
    expect(registeredCommands).toContain('pii:configure');

    // Disposer should be a function
    expect(typeof disposer).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Custom Patterns
// ---------------------------------------------------------------------------
describe('createPiiPlugin — custom patterns', () => {
  it('detects custom patterns when configured', () => {
    const plugin = createPiiPlugin({
      customPatterns: [
        {
          name: 'Employee ID',
          type: 'custom',
          pattern: /EMP-\d{6}/g,
          confidence: 0.85,
        },
      ],
    });

    // Simulate the scan logic by testing through the plugin install
    const registeredHandlers: Record<string, (...args: unknown[]) => void> =
      {};
    let piiState = {
      matches: [] as PiiMatch[],
      scanProgress: 0,
      config: {},
      lastScanAt: null as number | null,
    };
    const emittedEvents: Array<{ event: string; payload: unknown }> = [];

    const context = {
      api: {},
      store: {
        getState: () => ({
          pages: [
            {
              textContent: {
                lines: [{ text: 'Employee EMP-123456 reported the issue.' }],
              },
            },
          ],
        }),
        setState: () => {},
      },
      eventBus: {
        on: () => () => {},
        emit: (event: string, payload: unknown) => {
          emittedEvents.push({ event, payload });
        },
      },
      commandBus: {
        registerHandler: (cmd: string, handler: (...args: unknown[]) => void) => {
          registeredHandlers[cmd] = handler;
          return () => {};
        },
        dispatch: () => {},
      },
      config: {},
      registerState: (_key: string, initial: unknown) => {
        piiState = initial as typeof piiState;
      },
      getState: () => piiState,
      setState: (_key: string, updater: (prev: typeof piiState) => typeof piiState) => {
        piiState = updater(piiState);
      },
    };

    plugin.install(context);

    // Invoke pii:scan for page 0
    registeredHandlers['pii:scan']!({ pageIndex: 0 });

    // Check that the custom pattern was detected
    expect(piiState.matches.length).toBeGreaterThanOrEqual(1);
    const customMatch = piiState.matches.find(
      (m) => m.value === 'EMP-123456',
    );
    expect(customMatch).toBeDefined();
    expect(customMatch!.type).toBe('custom');
    expect(customMatch!.confidence).toBe(0.85);

    // Check event was emitted
    const detectedEvent = emittedEvents.find((e) => e.event === 'pii:detected');
    expect(detectedEvent).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Integration: Full text scan
// ---------------------------------------------------------------------------
describe('full text scan integration', () => {
  it('detects multiple PII types in a single text block', () => {
    const text = [
      'Dear Mr. John Smith,',
      'Your SSN 123-45-6789 and email john.smith@example.com',
      'have been associated with account 4111 1111 1111 1111.',
      'Please call (555) 987-6543 or visit 742 Evergreen Ave.',
      'IP logged: 192.168.1.42',
      'DOB: 07/04/1985',
    ].join('\n');

    const patternMatches = detectPatterns(text, 0);
    const nameMatches = detectNames(text, 0);
    const addrMatches = detectAddresses(text, 0);

    const all = deduplicateMatches([
      ...patternMatches,
      ...nameMatches,
      ...addrMatches,
    ]);
    const filtered = filterByThreshold(all, 0.7);

    // Should detect email, ssn, credit-card, phone, name, address, ip, dob
    const types = new Set(filtered.map((m) => m.type));
    expect(types.has('email')).toBe(true);
    expect(types.has('ssn')).toBe(true);
    expect(types.has('credit-card')).toBe(true);
    expect(types.has('phone')).toBe(true);
    expect(types.has('name')).toBe(true);
    expect(types.has('ip-address')).toBe(true);
    expect(types.has('date-of-birth')).toBe(true);

    // Risk should be critical due to SSN and credit card
    expect(computeOverallRisk(filtered)).toBe('critical');
  });
});
