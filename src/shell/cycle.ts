'use client';

import { useMemo } from 'react';
import { useWorkspace } from '@/state/workspace';
import { isUnresolved } from '@/lib/compliance';
import { paymentStatus } from '@/lib/schedule';

export interface StepStatus {
  done: boolean;
  /** Short count shown in the sidebar (e.g. open items). */
  count?: number;
  tone?: 'danger' | 'warning' | 'neutral';
  hint: string;
}

/** Live status for each compliance-cycle step, scoped to the active entity. */
export function useCycleStatus(): Record<string, StepStatus> {
  const ws = useWorkspace();
  return useMemo(() => {
    const id = ws.activeEntityId;
    const docs = ws.compliance.documents.filter((d) => d.doc.entityId === id);
    const pendingDocs = docs.filter((d) => d.status !== 'verified').length;
    const findings = ws.findings.filter((f) => f.entityId === id);
    const unresolved = findings.filter((f) => isUnresolved(ws.reviewOf(f.id).status));
    const critical = unresolved.filter((f) => f.severity === 'critical').length;
    const proposed = findings.filter((f) => ws.reviewOf(f.id).status === 'proposed').length;
    const pendingCorrections = findings.filter((f) => {
      const r = ws.reviewOf(f.id);
      return r.status === 'confirmed' && f.correction && !r.correctionApplied;
    }).length;
    const unpaid = ws.payments.filter((p) => p.entityId === id && p.status !== 'Dibayar');
    const overdue = unpaid.filter((p) => paymentStatus(p) === 'Terlambat').length;
    const ret = ws.returnFor(id).returnStatus;

    return {
      '/entities': { done: ws.entities.length > 0, hint: `${ws.entities.length} entitas terdaftar` },
      '/documents': {
        done: pendingDocs === 0,
        count: pendingDocs || undefined,
        tone: 'neutral',
        hint: pendingDocs ? `${pendingDocs} dokumen menunggu verifikasi` : 'Semua dokumen terverifikasi',
      },
      '/risk': {
        done: critical === 0,
        count: unresolved.length || undefined,
        tone: critical ? 'danger' : 'warning',
        hint: unresolved.length ? `${unresolved.length} temuan terbuka (${critical} kritis)` : 'Tidak ada temuan terbuka',
      },
      '/review': {
        done: unresolved.length === 0,
        count: proposed || undefined,
        tone: 'warning',
        hint: proposed ? `${proposed} usulan menunggu checker` : unresolved.length ? `${unresolved.length} temuan belum diputuskan` : 'Semua temuan sudah diputuskan',
      },
      '/calculation': {
        done: pendingCorrections === 0,
        count: pendingCorrections || undefined,
        tone: 'warning',
        hint: pendingCorrections ? `${pendingCorrections} koreksi belum diterapkan` : 'Koreksi fiskal mutakhir',
      },
      '/tax-return': {
        done: ret === 'Approved' || ret === 'Ready',
        hint: ret === 'Approved' || ret === 'Ready' ? 'SPT disetujui checker' : ret === 'Review' ? 'Menunggu persetujuan checker' : 'Masih draf',
      },
      '/payments': {
        done: unpaid.length === 0,
        count: unpaid.length || undefined,
        tone: overdue ? 'danger' : 'neutral',
        hint: unpaid.length ? `${unpaid.length} kewajiban belum disetor${overdue ? `, ${overdue} terlambat` : ''}` : 'Semua kewajiban lunas',
      },
    };
  }, [ws]);
}
