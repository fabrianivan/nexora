import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { CountryCode, formatCurrency } from '@/data/multiCountryTaxData';

export interface AuditTransaction {
  id: string;
  vendor: string;
  amount: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  bqZScore: number;
  anomalyTag: string;
  aiExplanation: string;
  mitigationStep: string;
}

export interface FiscalReconciliationItem {
  id: string;
  accountCode: string;
  accountName: string;
  commercialAmount: number;
  positiveCorrection: number;
  negativeCorrection: number;
  fiscalAmount: number;
  legalBasis: string;
  correctionReason: string;
}

export interface StudiesAndReconciliationViewProps {
  selectedEntity: {
    flag: string;
    legalName: string;
    countryCode: CountryCode;
    jurisdictionName: string;
  };
  cfg: {
    name: string;
    authorityShort: string;
    currencyCode: string;
    fraudSchemeName: string;
    auditTransactions: AuditTransaction[];
    fiscalReconciliation: FiscalReconciliationItem[];
    crossBorderTreatyNote: {
      partnerCountry: string;
      standardWhtRate: string;
      treatyWhtRate: string;
      requiredForm: string;
      annualTreatySaving: number;
    };
  };
  remediatedTrxIds: string[];
  onRemediateTransaction: (trxId: string, vendor: string) => void;
  onPreFillCopilotPrompt: (promptText: string) => void;
  onNavigateToCalculation?: () => void;
}

export function StudiesView({
  selectedEntity,
  cfg,
  remediatedTrxIds,
  onRemediateTransaction,
  onPreFillCopilotPrompt,
  onNavigateToCalculation,
}: StudiesAndReconciliationViewProps) {
  const activeCountry = selectedEntity.countryCode;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
            BigQuery ML &amp; Vertex AI Forensic Studies
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">
            {selectedEntity.flag} {selectedEntity.legalName} — Tax Anomaly &amp; Fraud Detection
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated detection for {cfg.fraudSchemeName}, transfer pricing deviations, and cross-border tax treaty screening.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onNavigateToCalculation && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToCalculation}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Fiscal Reconciliation
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Flagged Transactions */}
        <div className="lg:col-span-8 space-y-4">
          <Card padding="md" className="space-y-4">
            <CardHeader
              title={`Flagged Transactions & Forensic Z-Score Analysis (${cfg.authorityShort})`}
              subtitle="Ranked by BigQuery ML standard deviation outlier score (σ)."
            />

            <div className="space-y-3">
              {cfg.auditTransactions.map((trx) => {
                const isRemediated = remediatedTrxIds.includes(trx.id);
                const isHighRisk = trx.riskLevel === 'CRITICAL' || trx.riskLevel === 'HIGH';

                return (
                  <div
                    key={trx.id}
                    className={`p-4 rounded-xl border transition-all duration-150 space-y-2.5 ${
                      isRemediated
                        ? 'bg-emerald-50/40 border-emerald-300 border-l-4 border-l-emerald-600'
                        : isHighRisk
                        ? 'bg-rose-50/30 border-slate-200 hover:border-rose-300 border-l-4 border-l-rose-500 shadow-2xs'
                        : 'bg-amber-50/20 border-slate-200 hover:border-amber-300 border-l-4 border-l-amber-500 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-slate-500">
                          {trx.id}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{trx.vendor}</span>
                        <Badge
                          tone={
                            isRemediated
                              ? 'success'
                              : trx.riskLevel === 'CRITICAL' || trx.riskLevel === 'HIGH'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                          dot
                        >
                          {isRemediated ? 'REMEDIATED' : `Risk ${trx.riskScore}/100 (${trx.riskLevel})`}
                        </Badge>
                      </div>

                      <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
                        {formatCurrency(trx.amount, activeCountry)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-rose-700">{trx.anomalyTag}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono tabular-nums bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/80 text-[11px]">
                        BigQuery Z-Score: {trx.bqZScore}σ
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{trx.aiExplanation}</p>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-emerald-700 font-medium">
                        Recommendation: {trx.mitigationStep}
                      </span>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            onPreFillCopilotPrompt(
                              `Jelaskan mitigasi hukum atas anomali transaksi ${trx.id} (${trx.vendor}) senilai ${formatCurrency(trx.amount, activeCountry)} pada ${selectedEntity.legalName}.`
                            )
                          }
                          leftIcon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                        >
                          Tanya AI Copilot
                        </Button>

                        {!isRemediated && trx.riskLevel !== 'LOW' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onRemediateTransaction(trx.id, trx.vendor)}
                            leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                          >
                            Auto-Remediate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Treaty Relief Card */}
        <div className="lg:col-span-4 space-y-4">
          <Card padding="md" className="space-y-4">
            <CardHeader
              title={`Cross-Border Tax Treaty Relief (${selectedEntity.flag} ${selectedEntity.jurisdictionName})`}
              subtitle={`Bilateral DTA corridor: ${cfg.name} ⇄ ${cfg.crossBorderTreatyNote.partnerCountry}`}
            />

            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between font-mono tabular-nums pb-2 border-b border-blue-200/60">
                <span className="text-slate-600">Standard Domestic Rate:</span>
                <span className="font-bold text-slate-800">{cfg.crossBorderTreatyNote.standardWhtRate}</span>
              </div>

              <div className="flex items-center justify-between font-mono tabular-nums pb-2 border-b border-blue-200/60">
                <span className="text-emerald-800 font-semibold">Treaty Rate (DTA/P3B):</span>
                <span className="font-extrabold text-emerald-700 text-sm">{cfg.crossBorderTreatyNote.treatyWhtRate}</span>
              </div>

              <div className="space-y-0.5 text-[11px] text-slate-600">
                <span className="font-semibold block">Required Statutory Form:</span>
                <span className="font-mono text-slate-800">{cfg.crossBorderTreatyNote.requiredForm}</span>
              </div>

              <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between font-mono tabular-nums">
                <span className="font-semibold text-slate-700">Estimated Annual Saving:</span>
                <span className="font-bold text-blue-700">
                  {formatCurrency(cfg.crossBorderTreatyNote.annualTreatySaving, activeCountry)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function FiscalReconciliationAuditTable({
  entity,
  cfg,
  activeCountry,
}: {
  entity: { flag: string; legalName: string };
  cfg: {
    currencyCode: string;
    authorityShort: string;
    fiscalReconciliation: FiscalReconciliationItem[];
  };
  activeCountry: CountryCode;
}) {
  const totalCommercial = cfg.fiscalReconciliation.reduce((acc, i) => acc + i.commercialAmount, 0);
  const totalPositive = cfg.fiscalReconciliation.reduce((acc, i) => acc + i.positiveCorrection, 0);
  const totalNegative = cfg.fiscalReconciliation.reduce((acc, i) => acc + i.negativeCorrection, 0);
  const totalFiscal = cfg.fiscalReconciliation.reduce((acc, i) => acc + i.fiscalAmount, 0);

  return (
    <Card padding="md" className="space-y-4">
      <CardHeader
        title={`${entity.flag} ${entity.legalName} — Kertas Kerja Rekonsiliasi Fiskal (${cfg.currencyCode})`}
        subtitle="Audit-standard corporate income tax reconciliation between commercial GAAP and fiscal tax base."
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <caption className="sr-only">
            Kertas Kerja Rekonsiliasi Fiskal {entity.legalName}
          </caption>
          <thead>
            <tr className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 font-semibold select-none">
              <th className="py-3 px-4">Account Code &amp; Description</th>
              <th className="py-3 px-4 text-right">Commercial (Book)</th>
              <th className="py-3 px-4 text-right">Positive Adj. (+)</th>
              <th className="py-3 px-4 text-right">Negative Adj. (−)</th>
              <th className="py-3 px-4 text-right">Fiscal Base ({cfg.authorityShort})</th>
              <th className="py-3 px-4">Statutory Legal Basis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cfg.fiscalReconciliation.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900">
                  <span className="font-mono text-slate-400 mr-1.5">[{item.accountCode}]</span>
                  <span>{item.accountName}</span>
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                  {formatCurrency(item.commercialAmount, activeCountry)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700 font-bold">
                  {item.positiveCorrection > 0
                    ? `+${formatCurrency(item.positiveCorrection, activeCountry)}`
                    : '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-bold">
                  {item.negativeCorrection > 0
                    ? `(${formatCurrency(item.negativeCorrection, activeCountry)})`
                    : '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-slate-900">
                  {formatCurrency(item.fiscalAmount, activeCountry)}
                </td>
                <td className="py-3 px-4 text-slate-600 max-w-xs">
                  <strong className="block text-slate-800 text-[11px]">{item.legalBasis}</strong>
                  <span className="text-[11px] text-slate-500">{item.correctionReason}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50/80 font-semibold text-xs">
            <tr>
              <td className="py-3 px-4 text-slate-900 font-bold uppercase">
                Total Rekonsiliasi Fiskal
              </td>
              <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(totalCommercial, activeCountry)}
              </td>
              <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700 font-bold">
                +{formatCurrency(totalPositive, activeCountry)}
              </td>
              <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-bold">
                ({formatCurrency(totalNegative, activeCountry)})
              </td>
              <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-blue-700 text-sm">
                {formatCurrency(totalFiscal, activeCountry)}
              </td>
              <td className="py-3 px-4 text-slate-500 text-[11px]">Audit Certified</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
