import type { SourceDocument } from '@/lib/domain';

const ACCESSED_AT = '2026-10-27T00:00:00.000Z';
const CREATED_AT = '2026-10-27T00:00:00.000Z';

export const DEMO_SOURCES: SourceDocument[] = [
  {
    id: 'SRC-DEMO-TP-001',
    title: 'Nexora Demo Source: Transfer Pricing Documentation',
    publisher: 'Nexora internal demo corpus',
    sourceType: 'internal_demo',
    accessedAt: ACCESSED_AT,
    sourceVersion: 'demo-1',
    verified: false,
    status: 'Active',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    version: 1,
    chunks: [
      {
        id: 'SRC-DEMO-TP-001-C1',
        article: 'Demo principle 1',
        text: 'A group should maintain contemporaneous transfer pricing documentation for related-party transactions. This demo source is illustrative and is not legal or tax advice.',
      },
      {
        id: 'SRC-DEMO-TP-001-C2',
        article: 'Demo principle 2',
        text: 'Comparable transactions should be evaluated with a consistent method, documented assumptions, and a reviewable evidence trail.',
      },
    ],
  },
  {
    id: 'SRC-DEMO-GMT-001',
    title: 'Nexora Demo Source: Global Minimum Tax Overview',
    publisher: 'Nexora internal demo corpus',
    sourceType: 'internal_demo',
    accessedAt: ACCESSED_AT,
    sourceVersion: 'demo-1',
    verified: false,
    status: 'Active',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    version: 1,
    chunks: [
      {
        id: 'SRC-DEMO-GMT-001-C1',
        article: 'Demo overview 1',
        text: 'The OECD Pillar Two framework introduces a global minimum effective tax rate of 15 percent for large multinational groups, subject to detailed rules and thresholds. This demo source does not reproduce the full rules.',
      },
      {
        id: 'SRC-DEMO-GMT-001-C2',
        article: 'Demo overview 2',
        text: 'Safe harbours, substance-based carve-outs, and jurisdiction blending may affect an outcome. Applicability must be verified with qualified advisors and the current official text.',
      },
    ],
  },
  {
    id: 'SRC-DEMO-RISK-001',
    title: 'Nexora Demo Source: Invoice Risk Review',
    publisher: 'Nexora internal demo corpus',
    sourceType: 'internal_demo',
    accessedAt: ACCESSED_AT,
    sourceVersion: 'demo-1',
    verified: false,
    status: 'Active',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    version: 1,
    chunks: [
      {
        id: 'SRC-DEMO-RISK-001-C1',
        article: 'Demo review principle 1',
        text: 'Invoice risk review should compare vendor identity, tax registration, invoice sequence, amounts, dates, and supporting evidence before any action is taken.',
      },
      {
        id: 'SRC-DEMO-RISK-001-C2',
        article: 'Demo review principle 2',
        text: 'A finding is an indicator for human review, not a determination of fraud. Reviewers should document confirmation, rejection, and rationale.',
      },
    ],
  },
  {
    id: 'SRC-DEMO-AUDIT-001',
    title: 'Nexora Demo Source: Human Review and Audit',
    publisher: 'Nexora internal demo corpus',
    sourceType: 'internal_demo',
    accessedAt: ACCESSED_AT,
    sourceVersion: 'demo-1',
    verified: false,
    status: 'Active',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    version: 1,
    chunks: [
      {
        id: 'SRC-DEMO-AUDIT-001-C1',
        article: 'Demo audit principle 1',
        text: 'High-impact decisions require human review, a documented rationale, and an audit trail that identifies the actor, action, target, and time.',
      },
      {
        id: 'SRC-DEMO-AUDIT-001-C2',
        article: 'Demo audit principle 2',
        text: 'A reviewer marking a false positive provides calibration feedback. It does not mean that a model has automatically learned from the decision.',
      },
    ],
  },
];
