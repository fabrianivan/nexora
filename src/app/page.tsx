'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  type AuditLogEntry,
  type CopilotMessage,
  type CountryCode,
  type DocumentType,
  type ExtractedField,
  type FindingReviewStatus,
  type FindingV2,
  type ReconciliationLine,
  type Workspace,
  maskSensitiveId,
  newId,
} from '@/lib/domain';
import { createSampleWorkspace } from '@/lib/sampleDataset';
import { validateOwnership } from '@/lib/ownership';
import { detectFraud } from '@/lib/fraud';
import { crossValidateDocuments } from '@/lib/crossValidation';
import { calculateReconciliation } from '@/lib/reconciliation';
import { createReturnDraft } from '@/lib/returns';
import { COUNTRY_ADAPTERS, getCountryAdapter } from '@/lib/adapters/countryAdapter';
import { TAX_GLOSSARY, type Language, t } from '@/lib/i18n';
import { formatCurrency } from '@/data/multiCountryTaxData';
import {
  DraftReturnSummaryModal,
  ExecutiveSummaryReportModal,
} from '@/components/ExportAndPrintHelper';
import {
  DocumentIntelligenceSection,
  OwnershipStructureSection,
} from '@/components/OwnershipAndDocsSection';
import {
  FiscalReconciliationSection,
  FraudAndRiskEngineSection,
} from '@/components/RiskAndReconciliationSection';
import {
  AuditTrailAndReportSection,
  CopilotAndSimulatorSection,
} from '@/components/CopilotAndAuditSection';

export type HeroStepKey =
  | 'dashboard'
  | 'ownership'
  | 'documents'
  | 'risks'
  | 'reconciliation'
  | 'copilot'
  | 'audit';

const INITIAL_COPILOT_MESSAGES: CopilotMessage[] = [
  {
    id: 'COP-INIT-001',
    question:
      'Apa dasar aturan koreksi fiskal positif atas faktur pajak indikasi TBTS dan biaya jamuan tanpa daftar nominatif?',
    answer:
      'Ringkasan Regulasi Terkait:\n1. Berdasarkan Pasal 13 ayat (5) & ayat (9) UU PPN jo. SE-17/PJ/2018, Faktur Pajak harus memenuhi syarat formal dan material (berdasarkan transaksi sebenarnya). PPN Masukan dari faktur yang terindikasi TBTS tidak dapat dikreditkan (Pasal 9 ayat (8) UU PPN) dan beban terkait tanpa bukti transaksi riil dikoreksi fiskal positif.\n2. Berdasarkan Pasal 9 ayat (1) huruf e UU PPh jo. SE-27/PJ.22/1986, biaya entertainment/jamuan hanya dapat dikurangkan secara fiskal apabila wajib pajak melampirkan Daftar Nominatif pada SPT Tahunan. Tanpa daftar nominatif, seluruh beban Rp 85.000.000 wajib dikoreksi fiskal positif (perlu verifikasi ahli pajak).',
    citations: [
      {
        id: 'ID-UU-PPN-13',
        regulation: 'UU PPN No. 42/2009 s.t.d.t.d. UU HPP No. 7/2021 & SE-17/PJ/2018',
        article: 'Pasal 13 ayat (5) & ayat (9) jo. Pasal 9 ayat (8)',
        jurisdiction: 'ID',
        summary: 'Syarat formal dan material Faktur Pajak serta larangan pengkreditan PPN TBTS.',
        needsVerification: true,
      },
      {
        id: 'ID-SE-27-1986',
        regulation: 'UU PPh Pasal 9 ayat (1) & SE-27/PJ.22/1986',
        article: 'Syarat Daftar Nominatif Biaya Entertainment',
        jurisdiction: 'ID',
        summary: 'Biaya jamuan tanpa daftar nominatif wajib dikoreksi fiskal positif.',
        needsVerification: true,
      },
    ],
    confidence: 0.92,
    grounded: true,
    engineMode: 'demo',
    fallbackUsed: false,
    timestamp: '2026-10-24T07:05:00.000Z',
  },
];

export default function NexoraCorporateTaxPlatform() {
  const [lang, setLang] = useState<Language>('id');
  const dict = t(lang);

  // Core workspace state initialized with coherent end-to-end sample dataset
  const [workspace, setWorkspace] = useState<Workspace>(() => createSampleWorkspace());
  const [copilotMessages, setCopilotMessages] =
    useState<CopilotMessage[]>(INITIAL_COPILOT_MESSAGES);
  const [activeStep, setActiveStep] = useState<HeroStepKey>('dashboard');
  const [activeCountry, setActiveCountry] = useState<CountryCode>('ID');
  const [activeEntityId, setActiveEntityId] = useState<string>('ENT-ID-001');
  const [selectedDocId, setSelectedDocId] = useState<string>('DOC-2026-002');
  const [maskIds, setMaskIds] = useState<boolean>(false);
  const [showGlossary, setShowGlossary] = useState<boolean>(false);
  const [showDraftModal, setShowDraftModal] = useState<boolean>(false);
  const [showExecReportModal, setShowExecReportModal] = useState<boolean>(false);
  const [ruleFilterForRisks, setRuleFilterForRisks] = useState<string>('ALL');

  // Engine status from /api/status
  const [engineMode, setEngineMode] = useState<'demo' | 'live'>('demo');
  const [engineLabel, setEngineLabel] = useState<string>(
    'Smart Demo Engine (Deterministik Lokal)',
  );
  const [sampleLoadedToast, setSampleLoadedToast] = useState<string | null>(null);

  // Async action states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isAskingCopilot, setIsAskingCopilot] = useState<boolean>(false);
  const [hasCircularSimulated, setHasCircularSimulated] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.engineMode === 'live') {
          setEngineMode('live');
          setEngineLabel(data.engineLabel || 'Live Gemini 2.5 Flash Engine');
        }
      })
      .catch(() => {
        // Fallback silently to demo mode
      });
  }, []);

  const activeEntity = useMemo(() => {
    return (
      workspace.entities.find((e) => e.id === activeEntityId) ??
      workspace.entities.find((e) => e.country === activeCountry) ??
      workspace.entities[0]
    );
  }, [workspace.entities, activeEntityId, activeCountry]);

  const activeAdapter = useMemo(() => getCountryAdapter(activeEntity.country), [activeEntity]);

  // Live ownership validation
  const ownershipIssues = useMemo(
    () =>
      validateOwnership(
        workspace.entities,
        workspace.ownerships,
        workspace.shareholders ?? [],
      ),
    [workspace.entities, workspace.ownerships, workspace.shareholders],
  );

  // Live fraud & statistical engine evaluation
  const fraudSummary = useMemo(
    () =>
      detectFraud(workspace.documents, {
        suppressedRules: workspace.suppressedRules ?? [],
      }),
    [workspace.documents, workspace.suppressedRules],
  );

  // Merge user review statuses from workspace.findings with live fraud engine findings
  const mergedFindings: FindingV2[] = useMemo(() => {
    const combined: FindingV2[] = [];
    for (const saved of workspace.findings ?? []) {
      const suppressed = (workspace.suppressedRules ?? []).includes(saved.ruleId);
      const adjustedScore = suppressed ? Math.max(10, Math.round(saved.score * 0.65)) : saved.score;
      combined.push({
        ...saved,
        score: adjustedScore,
        isFalsePositive: suppressed || saved.isFalsePositive,
      });
    }
    return combined;
  }, [workspace.findings, workspace.suppressedRules]);

  const entityFindings = useMemo(
    () => mergedFindings.filter((f) => f.entityId === activeEntity.id),
    [mergedFindings, activeEntity.id],
  );

  // Live Cross-Validation Discrepancies
  const crossValidationIssues = useMemo(
    () =>
      crossValidateDocuments(
        activeEntity,
        workspace.documents.filter((d) => d.entityId === activeEntity.id),
      ),
    [activeEntity, workspace.documents],
  );

  const entityAdjustments: ReconciliationLine[] = useMemo(() => {
    return workspace.reconciliation.filter((a) => a.entityId === activeEntity.id);
  }, [workspace.reconciliation, activeEntity.id]);

  const baselineReconciliation = useMemo(
    () => calculateReconciliation(entityAdjustments, activeEntity.country),
    [entityAdjustments, activeEntity.country],
  );

  const currentDraftReturn = useMemo(
    () => createReturnDraft(activeEntity, baselineReconciliation),
    [activeEntity, baselineReconciliation],
  );

  const appendAuditLog = (
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
    updater?: (prev: Workspace) => Workspace,
  ) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `AUD-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
    };
    setWorkspace((prev) => {
      const next = updater ? updater(prev) : prev;
      return {
        ...next,
        auditLog: [newEntry, ...(next.auditLog ?? [])],
      };
    });
  };

  // 1-Click Sample Dataset Loader (No login, no API key required)
  const handleLoadSampleDataset = async () => {
    const sample = createSampleWorkspace();
    setWorkspace(sample);
    setActiveCountry('ID');
    setActiveEntityId('ENT-ID-001');
    setSelectedDocId('DOC-2026-002');
    setHasCircularSimulated(false);
    setSampleLoadedToast(
      'Dataset sampel multi-entitas (4 Negara, 12+ Dokumen, Temuan Risiko Dual-Layer, Kertas Kerja Rekonsiliasi) berhasil dimuat tanpa login/API key.',
    );
    setTimeout(() => setSampleLoadedToast(null), 5000);
  };

  // Ownership Interactive Handlers
  const handleFixIncompleteOwnership = () => {
    appendAuditLog(
      {
        actor: 'Rina Kusuma (Head of Tax)',
        action: 'ADD_OWNERSHIP_LINK',
        objectType: 'OWNERSHIP',
        objectId: 'OWN-1',
        beforeValue: 'Kepemilikan ENT-ID-001 atas ENT-SG-002: 85% (Selisih 15% belum tercatat)',
        afterValue: 'Kepemilikan ENT-ID-001 atas ENT-SG-002: 100% (Lengkap)',
        note: 'Rekonsiliasi Akta Perubahan dengan Daftar Pemegang Saham Grup.',
      },
      (prev) => ({
        ...prev,
        ownerships: prev.ownerships.map((o) =>
          o.id === 'OWN-1' ? { ...o, percentage: 100, effectivePercentage: 100 } : o,
        ),
      }),
    );
  };

  const handleToggleCircularSimulation = () => {
    if (hasCircularSimulated) {
      setHasCircularSimulated(false);
      setWorkspace((prev) => ({
        ...prev,
        ownerships: prev.ownerships.filter((o) => o.id !== 'OWN-CIRCULAR-TEST'),
      }));
    } else {
      setHasCircularSimulated(true);
      appendAuditLog(
        {
          actor: 'Arif Pratama (Internal Audit)',
          action: 'ADD_OWNERSHIP_LINK',
          objectType: 'OWNERSHIP',
          objectId: 'OWN-CIRCULAR-TEST',
          beforeValue: 'Tidak ada siklus kepemilikan',
          afterValue: 'Siklus terdeteksi: ENT-ID-001 -> ENT-SG-002 -> ENT-ID-001',
          note: 'Pengujian deteksi kepemilikan melingkar (circular ownership).',
        },
        (prev) => ({
          ...prev,
          ownerships: [
            ...prev.ownerships,
            {
              id: 'OWN-CIRCULAR-TEST',
              ownerId: 'ENT-SG-002',
              ownedId: 'ENT-ID-001',
              percentage: 15,
              linkType: 'INDIRECT',
              effectivePercentage: 15,
            },
          ],
        }),
      );
    }
  };

  // Document Intelligence Manual Field Correction Handler
  const handleUpdateExtractedField = (docId: string, fieldKey: string, newValue: string) => {
    const targetDoc = workspace.documents.find((d) => d.id === docId);
    if (!targetDoc) return;
    const oldField = targetDoc.extractedFieldsList?.find((f) => f.key === fieldKey);
    const beforeVal = oldField?.value ?? '';

    appendAuditLog(
      {
        actor: 'Rina Kusuma (Head of Tax)',
        action: 'EDIT_EXTRACTED_FIELD',
        objectType: 'EXTRACTED_FIELD',
        objectId: `${docId}:${fieldKey}`,
        beforeValue: beforeVal,
        afterValue: newValue,
        note: `Koreksi manual Human-in-the-Loop atas field ${oldField?.label ?? fieldKey} pada ${targetDoc.attachmentName}.`,
      },
      (prev) => ({
        ...prev,
        documents: prev.documents.map((doc) => {
          if (doc.id !== docId) return doc;
          const updatedFields: ExtractedField[] = (doc.extractedFieldsList ?? []).map((f) =>
            f.key === fieldKey
              ? {
                  ...f,
                  previousValue: f.value,
                  value: newValue,
                  confidence: 1.0,
                  source: 'manual',
                  manuallyCorrected: true,
                  correctedAt: new Date().toISOString(),
                  correctedBy: 'Rina Kusuma (Head of Tax)',
                  validationStatus: 'valid',
                  validationNote: 'Telah diverifikasi & dikoreksi manual oleh reviewer.',
                }
              : f,
          );

          const numericVal = Number(newValue.replace(/[^0-9.-]/g, ''));
          return {
            ...doc,
            extractionStatus: 'VERIFIED',
            counterpartyTaxId:
              fieldKey === 'counterpartyTaxId'
                ? {
                    ...doc.counterpartyTaxId,
                    value: newValue,
                    source: 'manual',
                    manuallyCorrected: true,
                  }
                : doc.counterpartyTaxId,
            taxIdValidated:
              fieldKey === 'counterpartyTaxId' && /^\d{15,16}$/.test(newValue.trim())
                ? true
                : doc.taxIdValidated,
            taxableBase:
              fieldKey === 'taxableBase' && !Number.isNaN(numericVal)
                ? {
                    ...doc.taxableBase,
                    value: numericVal,
                    source: 'manual',
                    manuallyCorrected: true,
                  }
                : doc.taxableBase,
            taxAmount:
              fieldKey === 'taxAmount' && !Number.isNaN(numericVal)
                ? {
                    ...doc.taxAmount,
                    value: numericVal,
                    source: 'manual',
                    manuallyCorrected: true,
                  }
                : doc.taxAmount,
            extractedFieldsList: updatedFields,
          };
        }),
      }),
    );
  };

  // Document Upload / Extraction Handler via /api/scan-document
  const handleSimulateUpload = async (preset: {
    fileName: string;
    documentType: DocumentType;
    customVendor?: string;
    customDpp?: number;
    customTax?: number;
  }) => {
    setIsScanning(true);
    setScanError(null);
    try {
      const response = await fetch('/api/scan-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nexora-demo': 'true',
        },
        body: JSON.stringify({
          entityId: activeEntity.id,
          country: activeEntity.country,
          fileName: preset.fileName,
          documentType: preset.documentType,
          customVendor: preset.customVendor,
          customDpp: preset.customDpp,
          customTax: preset.customTax,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setScanError(data.error || 'Gagal memindai dokumen.');
        return;
      }

      const newDocId = data.id || `DOC-${activeEntity.country}-${Date.now().toString().slice(-4)}`;
      appendAuditLog(
        {
          actor: 'Rina Kusuma (Head of Tax)',
          action: 'UPLOAD_DOCUMENT',
          objectType: 'DOCUMENT',
          objectId: newDocId,
          beforeValue: null,
          afterValue: `${preset.fileName} (Confidence ${data.confidenceScore}% · DPP ${data.dpp})`,
          note: `Diekstrak via ${data.engineLabel}`,
        },
        (prev) => ({
          ...prev,
          documents: [
            {
              id: newDocId,
              entityId: activeEntity.id,
              country: activeEntity.country,
              type: preset.documentType,
              title: data.title,
              version: 1,
              extractionStatus:
                data.status === 'PERLU_VERIFIKASI_MANUSIA' ? 'NEEDS_REVIEW' : 'EXTRACTED',
              attachmentName: preset.fileName,
              attachmentType: 'application/pdf',
              attachmentSize: 245_000,
              number: { value: data.docNumber, source: 'ai', confidence: 0.94 },
              date: { value: data.docDate, source: 'ai', confidence: 0.95 },
              counterparty: { value: data.vendorName, source: 'ai', confidence: 0.93 },
              counterpartyTaxId: { value: data.npwp16, source: 'ai', confidence: 0.72 },
              taxableBase: { value: Number(data.dpp), source: 'ai', confidence: 0.95 },
              taxAmount: { value: Number(data.taxAmount), source: 'ai', confidence: 0.89 },
              totalAmount: { value: Number(data.totalAmount), source: 'ai', confidence: 0.94 },
              ownershipPercentage: { value: null, source: 'ai' },
              invoiceUuid: { value: `UUID-${newDocId}`, source: 'ai' },
              taxIdValidated: Boolean(data.taxIdValidated),
              hasSupportingEvidence: Boolean(data.hasSupportingEvidence),
              deductible: Boolean(data.deductible),
              extractedFieldsList: data.structuredFields,
              createdAt: new Date().toISOString(),
            },
            ...prev.documents,
          ],
        }),
      );
      setSelectedDocId(newDocId);
    } catch {
      setScanError('Koneksi ke layanan ekstraksi terputus.');
    } finally {
      setIsScanning(false);
    }
  };

  // Fraud & Risk Review Handlers
  const handleUpdateFindingStatus = (
    findingId: string,
    status: FindingReviewStatus,
    reviewer: string,
    note: string,
  ) => {
    const target = mergedFindings.find((f) => f.id === findingId);
    if (!target) return;

    appendAuditLog(
      {
        actor: reviewer,
        action: 'UPDATE_FINDING_STATUS',
        objectType: 'FINDING',
        objectId: findingId,
        beforeValue: target.status,
        afterValue: status,
        note,
      },
      (prev) => ({
        ...prev,
        findings: (prev.findings ?? []).map((f) =>
          f.id === findingId
            ? {
                ...f,
                status,
                reviewer,
                reviewNote: note,
                timestamp: new Date().toISOString(),
              }
            : f,
        ),
      }),
    );
  };

  const handleMarkFalsePositive = (finding: FindingV2) => {
    appendAuditLog(
      {
        actor: 'Rina Kusuma (Head of Tax)',
        action: 'MARK_FALSE_POSITIVE',
        objectType: 'FINDING',
        objectId: finding.id,
        beforeValue: `Status: ${finding.status}, Skor: ${finding.score}/100`,
        afterValue: `Status: Ditolak (False Positive), Bobot Aturan ${finding.ruleId} -35%`,
        note: 'Ditandai False Positive oleh reviewer; aturan serupa diturunkan skornya pada data sampel.',
      },
      (prev) => {
        const nextSuppressed = Array.from(
          new Set([...(prev.suppressedRules ?? []), finding.ruleId]),
        );
        return {
          ...prev,
          suppressedRules: nextSuppressed,
          findings: (prev.findings ?? []).map((f) =>
            f.id === finding.id
              ? {
                  ...f,
                  status: 'Ditolak',
                  isFalsePositive: true,
                  reviewer: 'Rina Kusuma (Head of Tax)',
                  reviewNote: 'False positive terverifikasi dokumen pendukung.',
                  timestamp: new Date().toISOString(),
                }
              : f,
          ),
        };
      },
    );
  };

  const handleBulkUpdateStatus = (findingIds: string[], status: FindingReviewStatus) => {
    appendAuditLog(
      {
        actor: 'Rina Kusuma (Head of Tax)',
        action: 'BULK_UPDATE_FINDINGS',
        objectType: 'FINDING',
        objectId: findingIds.join(','),
        beforeValue: 'MIXED',
        afterValue: status,
        note: `Bulk action ${status} pada ${findingIds.length} temuan.`,
      },
      (prev) => ({
        ...prev,
        findings: (prev.findings ?? []).map((f) =>
          findingIds.includes(f.id)
            ? { ...f, status, timestamp: new Date().toISOString() }
            : f,
        ),
      }),
    );
  };

  // Reconciliation Handlers
  const handleToggleAdjustmentVerification = (adjustmentId: string) => {
    const target = workspace.reconciliation.find((a) => a.id === adjustmentId);
    if (!target) return;
    const nextStatus =
      target.verificationStatus === 'VERIFIED' ? 'NEEDS_VERIFICATION' : 'VERIFIED';

    appendAuditLog(
      {
        actor: 'Rina Kusuma (Head of Tax)',
        action: 'VERIFY_RECONCILIATION_LINE',
        objectType: 'RECONCILIATION',
        objectId: adjustmentId,
        beforeValue: target.verificationStatus ?? 'NEEDS_VERIFICATION',
        afterValue: nextStatus,
        note: `Perubahan status verifikasi baris rekonsiliasi fiskal (${target.description}).`,
      },
      (prev) => ({
        ...prev,
        reconciliation: prev.reconciliation.map((a) =>
          a.id === adjustmentId ? { ...a, verificationStatus: nextStatus } : a,
        ),
      }),
    );
  };

  const handleAddFiscalAdjustment = (adj: {
    description: string;
    positiveCorrection: number;
    negativeCorrection: number;
    ruleBasis: string;
  }) => {
    const id = `REC-${Date.now().toString().slice(-4)}`;
    appendAuditLog(
      {
        actor: 'Rina Kusuma (Head of Tax)',
        action: 'UPDATE_RECONCILIATION',
        objectType: 'RECONCILIATION',
        objectId: id,
        beforeValue: null,
        afterValue: `${adj.description} (+${adj.positiveCorrection} / -${adj.negativeCorrection})`,
        note: adj.ruleBasis,
      },
      (prev) => ({
        ...prev,
        reconciliation: [
          ...prev.reconciliation,
          {
            id,
            entityId: activeEntity.id,
            accountCode: '6999',
            category: 'OPEX',
            description: adj.description,
            commercialAmount: 0,
            positiveCorrection: adj.positiveCorrection,
            negativeCorrection: adj.negativeCorrection,
            ruleBasis: adj.ruleBasis,
            verificationStatus: 'NEEDS_VERIFICATION',
          },
        ],
      }),
    );
  };

  // Copilot RAG Handler via /api/copilot
  const handleAskCopilot = async (question: string) => {
    setIsAskingCopilot(true);
    try {
      const activeFindingsText = entityFindings
        .slice(0, 3)
        .map((f) => `${f.ruleId} (Skor ${f.score})`)
        .join(', ');
      const activeReconText = `PKP ${formatCurrency(
        baselineReconciliation.taxableIncome,
        activeEntity.country,
      )}, PPh Terutang ${formatCurrency(baselineReconciliation.taxDue, activeEntity.country)}`;

      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nexora-demo': 'true',
        },
        body: JSON.stringify({
          prompt: question,
          country: activeEntity.country,
          language: lang,
          activeEntityName: activeEntity.name,
          activeEntityTaxId: activeEntity.taxId,
          activeFindingSummary: activeFindingsText,
          activeReconciliationSummary: activeReconText,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const msg: CopilotMessage = {
          id: data.id || newId('COP'),
          question,
          answer: data.answer || data.reply,
          citations: data.citations ?? [],
          confidence: typeof data.confidence === 'number' ? data.confidence / 100 : 0.85,
          grounded: Boolean(data.grounded),
          engineMode: data.engineMode === 'live' ? 'live' : 'demo',
          fallbackUsed: Boolean(data.fallbackUsed),
          timestamp: new Date().toISOString(),
        };
        setCopilotMessages((prev) => [msg, ...prev]);
        appendAuditLog({
          actor: 'Budi Santoso (Senior Tax Partner)',
          action: 'ASK_COPILOT',
          objectType: 'COPILOT',
          objectId: msg.id,
          beforeValue: null,
          afterValue: `Grounded: ${msg.grounded} (${msg.citations.length} sitasi)`,
          note: question.slice(0, 100),
        });
      }
    } finally {
      setIsAskingCopilot(false);
    }
  };

  const heroSteps: Array<{ key: HeroStepKey; label: string; badge?: number }> = [
    { key: 'dashboard', label: dict.steps.dashboard },
    { key: 'ownership', label: dict.steps.ownership, badge: ownershipIssues.length },
    {
      key: 'documents',
      label: dict.steps.documents,
      badge: workspace.documents.filter((d) => d.entityId === activeEntity.id).length,
    },
    { key: 'risks', label: dict.steps.risks, badge: mergedFindings.length },
    { key: 'reconciliation', label: dict.steps.reconciliation },
    { key: 'copilot', label: dict.steps.copilot },
    {
      key: 'audit',
      label: dict.steps.audit,
      badge: (workspace.auditLog ?? []).length,
    },
  ];

  const criticalFindingsCount = mergedFindings.filter((f) => f.severity === 'critical').length;
  const highFindingsCount = mergedFindings.filter((f) => f.severity === 'high').length;
  const pendingReviewCount = mergedFindings.filter(
    (f) => f.status === 'Baru' || f.status === 'Ditinjau',
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Compliance & Engine Mode Status Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Brand & Permanent Engine Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 font-extrabold text-white shadow-md">
                NX
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-white">
                    {dict.appTitle}
                  </span>
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
                    v2.0 BFSI
                  </span>
                </div>
                <p className="hidden text-[11px] text-slate-400 sm:block">{dict.appSubtitle}</p>
              </div>
            </div>

            {/* Permanent Demo / Live Mode Status Badge with Tooltip */}
            <div
              role="status"
              title={
                engineMode === 'live' ? dict.engineTooltipLive : dict.engineTooltipDemo
              }
              className={`cursor-help rounded-full border px-3 py-1 text-xs font-bold ${
                engineMode === 'live'
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                  : 'border-amber-500/50 bg-amber-500/15 text-amber-300'
              }`}
            >
              {engineMode === 'live' ? dict.liveBadge : dict.demoBadge}
            </div>
          </div>

          {/* Right Controls: Country Adapter, Masking, Glossary, Language */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Country Adapter Selector with Full vs Preview Badges */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1">
              {(Object.keys(COUNTRY_ADAPTERS) as CountryCode[]).map((code) => {
                const adapter = COUNTRY_ADAPTERS[code];
                const isSelected = activeEntity.country === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setActiveCountry(code);
                      const ent = workspace.entities.find((e) => e.country === code);
                      if (ent) {
                        setActiveEntityId(ent.id);
                        const firstDoc = workspace.documents.find((d) => d.entityId === ent.id);
                        if (firstDoc) setSelectedDocId(firstDoc.id);
                      }
                    }}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{code}</span>
                    <span
                      className={`rounded px-1 text-[9px] font-bold uppercase ${
                        adapter.status === 'full'
                          ? 'bg-emerald-500/30 text-emerald-200'
                          : 'bg-amber-500/30 text-amber-200'
                      }`}
                    >
                      {adapter.status === 'full' ? 'Full' : 'Preview'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sensitive ID Masking Toggle */}
            <button
              type="button"
              onClick={() => setMaskIds((v) => !v)}
              aria-pressed={maskIds}
              className={`rounded-xl border px-3 py-1.5 font-semibold transition ${
                maskIds
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
              }`}
            >
              🔒 {dict.maskSensitiveLabel}: {maskIds ? 'ON' : 'OFF'}
            </button>

            {/* Tax Glossary Button */}
            <button
              type="button"
              onClick={() => setShowGlossary((v) => !v)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 font-semibold text-slate-200 hover:border-slate-700"
            >
              📖 Glosarium
            </button>

            {/* Language Toggle ID / EN */}
            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'id' ? 'en' : 'id'))}
              className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono font-bold text-indigo-300 hover:border-slate-700"
            >
              {lang.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Hero Flow Stepper & Primary Navigation */}
        <nav
          aria-label="Navigasi utama"
          className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto border-t border-slate-900 px-4 py-2 sm:px-6"
        >
          {heroSteps.map((step) => {
            const isCurrent = activeStep === step.key;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveStep(step.key)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{step.label}</span>
                {step.badge !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                      isCurrent ? 'bg-white/20 text-white' : 'bg-slate-800 text-indigo-300'
                    }`}
                  >
                    {step.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Jump Aliases for Calculation & Payment */}
          <button
            type="button"
            onClick={() => setActiveStep('reconciliation')}
            className="ml-auto shrink-0 rounded-xl border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white"
          >
            Calculation
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('reconciliation')}
            className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white"
          >
            Payment
          </button>
        </nav>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Honest Scope & Non-Advice Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 font-bold ${
                activeAdapter.status === 'full'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {activeAdapter.flag} {activeAdapter.name} ({activeAdapter.authority}) —{' '}
              {activeAdapter.status === 'full'
                ? dict.fullScopeBadge
                : dict.previewScopeBadge}
            </span>
            <span>Format ID: {activeAdapter.taxIdFormat}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Entitas Aktif: <strong className="text-white">{activeEntity.name}</strong> (
            {maskIds ? maskSensitiveId(activeEntity.taxId) : activeEntity.taxId})
          </span>
        </div>

        {/* Toast when 1-click Sample Dataset is loaded */}
        {sampleLoadedToast && (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/50 bg-emerald-950/40 px-4 py-3 text-xs font-semibold text-emerald-200"
          >
            ✓ {sampleLoadedToast}
          </div>
        )}

        {/* Collapsible Tax Glossary Drawer */}
        {showGlossary && (
          <section
            aria-label="Glosarium Istilah Pajak"
            className="rounded-2xl border border-indigo-500/40 bg-slate-900/95 p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Glosarium Istilah Perpajakan Korporasi (ID / EN)
              </h2>
              <button
                type="button"
                onClick={() => setShowGlossary(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tutup ✕
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TAX_GLOSSARY.map((item) => (
                <div
                  key={item.term}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs"
                >
                  <p className="font-mono font-bold text-indigo-300">{item.term}</p>
                  <p className="mt-0.5 font-semibold text-white">
                    {lang === 'id' ? item.fullId : item.fullEn}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {lang === 'id' ? item.definitionId : item.definitionEn}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* STAGE 1: ONBOARDING & EXECUTIVE DASHBOARD */}
        {activeStep === 'dashboard' && (
          <div className="space-y-6">
            {/* Onboarding Hero Banner */}
            <section className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 p-6 shadow-xl">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-3 lg:col-span-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
                    <span>Google Cloud AI Builder Cup · Track 1 BFSI</span>
                    <span>·</span>
                    <span>Risk, Fraud & Corporate Tax Compliance</span>
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {dict.valueProposition}
                  </h1>
                  <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                    <strong>Masalah:</strong> Tim pajak grup usaha multi-entitas harus mencocokkan
                    ratusan e-Faktur, akta pemegang saham, dan bukti potong secara manual di bawah
                    ancaman koreksi fiskal atas faktur TBTS, beban non-deductible, dan anomali
                    kepemilikan. <strong>Solusi Nexora:</strong> Satu alur terpadu dari ekstraksi
                    dokumen berdampingan, validasi silang, deteksi risiko dual-layer (Rule +
                    Statistik Z-Score/Benford), hingga draf rekonsiliasi fiskal dan jejak audit.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleLoadSampleDataset}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500"
                    >
                      🚀 {dict.loadSampleBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStep('documents')}
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
                    >
                      Mulai Alur Utama: Document Intelligence →
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStep('risks')}
                      className="rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      Tinjau {mergedFindings.length} Temuan Risiko
                    </button>
                  </div>
                </div>

                {/* Hero Flow Interactive Checklist Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 lg:col-span-4">
                  <h2 className="text-xs font-bold tracking-wider text-indigo-300 uppercase">
                    Alur Utama End-to-End (Hero Flow 3 Menit)
                  </h2>
                  <ol className="mt-2.5 space-y-2 text-xs">
                    {[
                      {
                        step: '1. Upload & Ekstraksi Terstruktur',
                        target: 'documents' as HeroStepKey,
                        detail: `${workspace.documents.length} dokumen grup terekstrak`,
                      },
                      {
                        step: '2. Validasi Silang & Struktur Kepemilikan',
                        target: 'ownership' as HeroStepKey,
                        detail: `${ownershipIssues.length} anomali kepemilikan + ${crossValidationIssues.length} selisih dokumen`,
                      },
                      {
                        step: '3. Fraud & Risk Engine (Rule + Statistik)',
                        target: 'risks' as HeroStepKey,
                        detail: `${mergedFindings.length} temuan (${criticalFindingsCount} Kritis, ${highFindingsCount} Tinggi)`,
                      },
                      {
                        step: '4. Rekonsiliasi Fiskal & Ekspor Draf SPT',
                        target: 'reconciliation' as HeroStepKey,
                        detail: `PKP ${formatCurrency(baselineReconciliation.taxableIncome, activeEntity.country)}`,
                      },
                      {
                        step: '5. Copilot RAG & Jejak Audit',
                        target: 'audit' as HeroStepKey,
                        detail: `${(workspace.auditLog ?? []).length} entri audit tercatat`,
                      },
                    ].map((item) => (
                      <li key={item.step}>
                        <button
                          type="button"
                          onClick={() => setActiveStep(item.target)}
                          className="flex w-full items-center justify-between rounded-lg border border-slate-800/90 bg-slate-900/70 px-3 py-2 text-left hover:border-indigo-500/50"
                        >
                          <div>
                            <p className="font-semibold text-white">{item.step}</p>
                            <p className="text-[11px] text-slate-400">{item.detail}</p>
                          </div>
                          <span className="text-indigo-400">→</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>

            {/* Executive KPI Cards */}
            <section
              aria-label="Metrik Utama Kepatuhan Grup"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">Cakupan Grup & Dokumen</p>
                <p className="mt-1 text-2xl font-extrabold text-white">
                  {workspace.entities.length} Entitas · {workspace.documents.length} Dokumen
                </p>
                <p className="mt-1 text-xs text-emerald-300">
                  ID (Full) · SG, MY, US (Preview Adapter)
                </p>
              </div>

              <div className="rounded-2xl border border-rose-500/30 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">Temuan Risiko per Severity</p>
                <p className="mt-1 text-2xl font-extrabold text-white">
                  {mergedFindings.length} Temuan Aktif
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  <span className="text-rose-300">🔴 {criticalFindingsCount} Kritis</span>
                  <span>·</span>
                  <span className="text-amber-300">🟠 {highFindingsCount} Tinggi</span>
                  <span>·</span>
                  <span className="text-indigo-300">{pendingReviewCount} Menunggu Review</span>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">
                  Potensi Koreksi Fiskal Positif ({activeEntity.country})
                </p>
                <p className="mt-1 font-mono text-xl font-extrabold text-amber-300">
                  +{formatCurrency(baselineReconciliation.positiveCorrections, activeEntity.country)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Dampak PPh Terutang:{' '}
                  {formatCurrency(baselineReconciliation.taxDue, activeEntity.country)}
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">Tugas Menunggu Review Manusia</p>
                <p className="mt-1 text-2xl font-extrabold text-indigo-300">
                  {pendingReviewCount} Temuan ·{' '}
                  {
                    entityAdjustments.filter((a) => a.verificationStatus === 'NEEDS_VERIFICATION')
                      .length
                  }{' '}
                  Koreksi
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Human-in-the-Loop · {(workspace.auditLog ?? []).length} Log Audit
                </p>
              </div>
            </section>

            {/* Multi-Entity Compliance Status & Pending Review Queue */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-7">
                <h2 className="text-sm font-bold text-white">
                  Status Kepatuhan per Entitas Grup (Klik untuk Beralih Entitas)
                </h2>
                <div className="mt-3 space-y-2.5">
                  {workspace.entities.map((ent) => {
                    const adapter = getCountryAdapter(ent.country);
                    const entDocs = workspace.documents.filter((d) => d.entityId === ent.id);
                    const entRisks = mergedFindings.filter((f) => f.entityId === ent.id);
                    const isSelected = ent.id === activeEntity.id;

                    return (
                      <div
                        key={ent.id}
                        onClick={() => {
                          setActiveCountry(ent.country);
                          setActiveEntityId(ent.id);
                          const firstDoc = entDocs[0];
                          if (firstDoc) setSelectedDocId(firstDoc.id);
                        }}
                        className={`cursor-pointer rounded-xl border p-3.5 transition ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/30'
                            : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  adapter.status === 'full'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {ent.country} ·{' '}
                                {adapter.status === 'full' ? 'Alur Penuh' : 'Preview'}
                              </span>
                              <span className="text-sm font-bold text-white">{ent.name}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Tax ID:{' '}
                              {maskIds ? maskSensitiveId(ent.taxId) : ent.taxId} · Form:{' '}
                              {adapter.returnFormTemplate.formName}
                            </p>
                          </div>

                          <div className="text-right text-xs">
                            <span className="font-mono font-bold text-slate-200">
                              {entDocs.length} Dokumen · {entRisks.length} Temuan
                            </span>
                            <p className="text-[11px] text-indigo-300">
                              Status: {ent.status ?? 'ACTIVE'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Review Tasks */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-5">
                <h2 className="text-sm font-bold text-white">
                  Antrean Tugas Prioritas (Menunggu Review Manusia)
                </h2>
                <div className="mt-3 space-y-2.5 text-xs">
                  {mergedFindings
                    .filter((f) => f.status === 'Baru' || f.status === 'Ditinjau')
                    .slice(0, 4)
                    .map((task) => (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/80 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-rose-300 uppercase">
                            [{task.severity}] {task.ruleId}
                          </span>
                          <span className="font-mono text-[11px] text-amber-300">
                            Skor {task.score}/100
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-white">{task.title}</p>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveStep('risks')}
                            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                          >
                            Review & Putuskan →
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: OWNERSHIP STRUCTURE */}
        {activeStep === 'ownership' && (
          <OwnershipStructureSection
            entities={workspace.entities}
            ownerships={workspace.ownerships}
            shareholders={workspace.shareholders ?? []}
            issues={ownershipIssues}
            maskIds={maskIds}
            onFixIncompleteOwnership={handleFixIncompleteOwnership}
            onToggleCircularSimulation={handleToggleCircularSimulation}
            hasCircularSimulated={hasCircularSimulated}
            onJumpToRisks={(rule) => {
              setRuleFilterForRisks(rule ?? 'ALL');
              setActiveStep('risks');
            }}
          />
        )}

        {/* STAGE 3: DOCUMENT INTELLIGENCE & CROSS-VALIDATION */}
        {activeStep === 'documents' && (
          <DocumentIntelligenceSection
            activeCountry={activeEntity.country}
            activeEntity={activeEntity}
            documents={workspace.documents}
            selectedDocId={selectedDocId}
            onSelectDoc={setSelectedDocId}
            onUpdateExtractedField={handleUpdateExtractedField}
            onSimulateUpload={handleSimulateUpload}
            isScanning={isScanning}
            scanError={scanError}
            crossDiscrepancies={crossValidationIssues}
            maskIds={maskIds}
          />
        )}

        {/* STAGE 4: FRAUD & RISK ENGINE */}
        {activeStep === 'risks' && (
          <FraudAndRiskEngineSection
            activeCountry={activeEntity.country}
            findings={mergedFindings}
            populationStats={fraudSummary.statsByEntity[activeEntity.id]}
            suppressedRules={workspace.suppressedRules ?? []}
            initialRuleFilter={ruleFilterForRisks}
            onUpdateFindingStatus={handleUpdateFindingStatus}
            onMarkFalsePositive={handleMarkFalsePositive}
            onBulkUpdateStatus={handleBulkUpdateStatus}
            onJumpToReconciliation={() => setActiveStep('reconciliation')}
          />
        )}

        {/* STAGE 5: FISCAL RECONCILIATION & DRAFT SPT */}
        {activeStep === 'reconciliation' && (
          <FiscalReconciliationSection
            activeEntity={activeEntity}
            adjustments={entityAdjustments}
            baselineTotals={baselineReconciliation}
            onToggleVerification={handleToggleAdjustmentVerification}
            onAddAdjustment={handleAddFiscalAdjustment}
            onOpenDraftModal={() => setShowDraftModal(true)}
            onJumpToFinding={(findingId) => {
              setRuleFilterForRisks('ALL');
              setActiveStep('risks');
              void findingId;
            }}
          />
        )}

        {/* STAGE 6: GROUNDED RAG COPILOT & SIMULATOR */}
        {activeStep === 'copilot' && (
          <CopilotAndSimulatorSection
            activeCountry={activeEntity.country}
            activeEntity={activeEntity}
            activeFindingsSummary={`${entityFindings.length} temuan risiko aktif (${
              entityFindings.filter((f) => f.severity === 'critical').length
            } Kritis)`}
            activeReconciliationSummary={`Laba Komersial ${formatCurrency(
              baselineReconciliation.commercialProfit,
              activeEntity.country,
            )} → PKP ${formatCurrency(
              baselineReconciliation.taxableIncome,
              activeEntity.country,
            )}`}
            messages={copilotMessages}
            onAskQuestion={handleAskCopilot}
            isAsking={isAskingCopilot}
          />
        )}

        {/* STAGE 7: AUDIT TRAIL & EXECUTIVE REPORT */}
        {activeStep === 'audit' && (
          <AuditTrailAndReportSection
            auditLogs={workspace.auditLog ?? []}
            onOpenExecutiveReport={() => setShowExecReportModal(true)}
          />
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="mt-12 border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-5xl px-4">
          <p>{dict.disclaimerBanner}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Engine: {engineLabel} · Analytics: {dict.localBigQueryBadge} · Watermark Ekspor:{' '}
            {dict.draftWatermark}
          </p>
        </div>
      </footer>

      {/* Printable Modals */}
      <DraftReturnSummaryModal
        open={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        draft={currentDraftReturn}
        entity={activeEntity}
        adjustments={entityAdjustments}
      />

      <ExecutiveSummaryReportModal
        open={showExecReportModal}
        onClose={() => setShowExecReportModal(false)}
        entity={activeEntity}
        findings={entityFindings}
        reconciliationTotals={baselineReconciliation}
        auditLogs={workspace.auditLog ?? []}
      />
    </div>
  );
}
