'use client';

import React from 'react';
import Link from 'next/link';
import { BookMarked, CircleAlert, CircleCheck, CircleX, ExternalLink } from 'lucide-react';
import type { RiskFinding } from '@/lib/compliance';
import { RULES } from '@/lib/compliance';
import { FIELD_LABEL, caseChecks, flaggedFields, type CaseCheck, type DocField } from '@/lib/cases';
import { RULE_SOURCES, corpusChunk } from '@/data/taxCorpus';
import type { TaxDocument } from '@/lib/domain';
import { dateShort, money } from '@/lib/format';
import { useWorkspace } from '@/state/workspace';
import { cn } from '@/ui';

const CHECK_ICON = {
  fail: <CircleX className="size-4 text-danger-600" aria-label="Gagal" />,
  warn: <CircleAlert className="size-4 text-warning-600" aria-label="Perlu dicek" />,
  pass: <CircleCheck className="size-4 text-success-600" aria-label="Lolos" />,
};

export function CheckList({ checks }: { checks: CaseCheck[] }) {
  if (!checks.length) return <p className="text-[13px] text-ink-3">Tidak ada pemeriksaan per dokumen untuk aturan ini.</p>;
  return (
    <ul className="rounded-xl border border-line divide-y divide-line">
      {checks.map((c) => (
        <li key={c.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
          <span className="mt-px shrink-0">{CHECK_ICON[c.status]}</span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-ink">{c.label}</span>
            <span className="block text-xs text-ink-2 break-words">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const INVOICE_FIELDS: DocField[] = ['number', 'date', 'counterparty', 'counterpartyTaxId', 'taxableBase', 'taxAmount', 'totalAmount', 'invoiceUuid'];
const REGISTER_FIELDS: DocField[] = ['number', 'date', 'counterparty', 'counterpartyTaxId', 'ownershipPercentage'];

function fieldValue(doc: TaxDocument, field: DocField): string {
  const v = doc[field].value;
  if (v === null || v === '') return '—';
  if (field === 'taxableBase' || field === 'taxAmount' || field === 'totalAmount') return money(Number(v), doc.country);
  if (field === 'ownershipPercentage') return `${v}%`;
  if (field === 'date') return dateShort(String(v));
  return String(v);
}

function DocumentFields({ doc, flagged, account }: { doc: TaxDocument; flagged: Set<DocField>; account?: string }) {
  const fields = (doc.type === 'shareholder' ? REGISTER_FIELDS : INVOICE_FIELDS).filter((f) => f !== 'invoiceUuid' || doc.country === 'MY' || doc.invoiceUuid.value);
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-subtle border-b border-line">
        <span className="min-w-0 text-[13px] font-medium text-ink truncate">{doc.counterparty.value}</span>
        <Link href={`/documents?d=${encodeURIComponent(doc.id)}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 shrink-0">
          {doc.attachmentName} <ExternalLink className="size-3" />
        </Link>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2">
        {fields.map((f) => {
          const field = doc[f];
          const isFlagged = flagged.has(f);
          return (
            <div key={f} className={cn('px-3.5 py-2 border-b border-line sm:odd:border-r', isFlagged && 'bg-danger-50/60')}>
              <dt className="flex items-center justify-between gap-2 text-[11px] text-ink-3">
                <span className={cn(isFlagged && 'text-danger-700 font-medium')}>{FIELD_LABEL[f]}{isFlagged ? ' · ditandai' : ''}</span>
                <span className="num">{field.source === 'manual' ? 'manual' : typeof field.confidence === 'number' ? `${Math.round(field.confidence * 100)}%` : 'AI'}</span>
              </dt>
              <dd className={cn('mt-0.5 text-[13px] text-ink break-all', (f === 'number' || f === 'counterpartyTaxId' || f === 'invoiceUuid') && 'font-mono text-xs')}>{fieldValue(doc, f)}</dd>
            </div>
          );
        })}
      </dl>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3.5 py-2 text-xs text-ink-3">
        <span>Identitas {doc.taxIdValidated ? 'tervalidasi' : 'belum tervalidasi'}</span>
        <span>Bukti pendukung {doc.hasSupportingEvidence ? 'ada' : 'tidak ada'}</span>
        {account && <span>Akun {account}</span>}
      </div>
    </div>
  );
}

/** What fired, on which fields, and the rule behind it. */
export function Evidence({ finding }: { finding: RiskFinding }) {
  const ws = useWorkspace();
  const docs = ws.compliance.documents.filter((d) => finding.documentIds.includes(d.doc.id));
  const checks = caseChecks(finding, ws.compliance.documents);
  const sources = (RULE_SOURCES[finding.rule] ?? []).map(corpusChunk).filter((x): x is NonNullable<typeof x> => Boolean(x));
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-ink">Mengapa ditandai</h3>
        <p className="mt-1 text-[13px] text-ink-2 leading-relaxed">{finding.explanation}</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink mb-2">Pemeriksaan</h3>
        <CheckList checks={checks} />
      </section>

      {docs.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-ink mb-2">Dokumen sumber <span className="font-normal text-ink-3">· field yang ditandai disorot, keyakinan per field</span></h3>
          <div className="space-y-3">
            {docs.map((d) => (
              <DocumentFields key={d.doc.id} doc={d.doc} flagged={flaggedFields(checks, d.doc.id)} account={d.ledger ? `${d.ledger.accountCode} ${d.ledger.accountName}` : undefined} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-ink mb-1">Dasar aturan</h3>
        <p className="text-xs text-ink-3 mb-2">{RULES[finding.rule]?.basis}</p>
        {sources.length > 0 && (
          <ul className="space-y-2">
            {sources.map(({ chunk, source }) => (
              <li key={chunk.id} className="rounded-lg border border-line px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-ink">
                  <BookMarked className="size-3.5 text-ink-3" /> {chunk.article}
                  {!source.verified && <span className="font-normal text-ink-4">· ringkasan internal, cek teks resmi</span>}
                </div>
                <p className="mt-1 text-xs text-ink-2 leading-relaxed">{chunk.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink mb-1">Rekomendasi tindakan</h3>
        <p className="text-[13px] text-ink-2">{finding.remediation}</p>
      </section>
    </div>
  );
}
